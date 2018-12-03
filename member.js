/* Copyright (c) 2018 voxgig and other contributors, MIT License */
'use strict'

// TODO: ensure tags don't get obliterated
// TODO: check kind has been defined

const Util = require('util')

const Joi = require('joi')

// Semantic Version of sys/member entities
const SYS_MEMBER_SV = 0


module.exports = member

member.defaults = {
  kinds:{}
}

function member(opts) {
  const seneca = this

  function define_patterns() {
    seneca
      .message('role:member,add:kinds', add_kinds)
      .message('role:member,get:kinds', get_kinds)
      .message('role:member,add:member', add_member)
      .message('role:member,is:member', is_member)
      .message('role:member,remove:member', remove_member)
      .message('role:member,update:member', update_member)
      .message('role:member,list:children', list_children)
      .message('role:member,list:parents', list_parents)
  }


  const validate_member = {
    parent: Joi.string(),
    child: Joi.string(),
    kind: Joi.string(),
    code: Joi.string(),
    tags: Joi.array().items(Joi.string())
  }


  add_kinds.validate = {
    kinds: Joi.object().pattern(/./, Joi.object().unknown(false).keys({
      p: Joi.string().required(),
      c: Joi.string().required()
    }))
  }

  async function add_kinds(msg, reply) {
    opts.kinds = Object.assign(opts.kinds,msg.kinds)
    return { kinds: opts.kinds }
  }


  async function get_kinds(msg, reply) {
    return { kinds: opts.kinds }
  }



  add_member.validate = Object.assign({}, validate_member, {
    parent: Joi.string().required(),
    child: Joi.string().required(),
    kind: Joi.string().required(),
  })


  // idemptotent
  async function add_member(msg, reply) {
    const member_ent = this.entity('sys/member')

    const q = {
      p: msg.parent,
      c: msg.child,
      k: msg.kind,
      d: msg.code,
    }
    const prev = await member_ent.make$().load$(q)

    var member
    
    if(prev) {
      member = await prev.data$({
        t: msg.tags
      }).save$()
    }
    else {
      const data = {
        p: msg.parent,
        c: msg.child,
        k: msg.kind,
        d: msg.code,
        t: msg.tags,
        sv: SYS_MEMBER_SV
      }
      if(msg.id) {
        data.id$ = msg.id
      }

      member = await member_ent.make$().data$(data).save$()
    }

    return member
  }


  is_member.validate = Object.assign({}, validate_member, {
    parent: Joi.string().required(),
  })

  async function is_member(msg, reply) {
    const member_ent = this.entity('sys/member')

    // required
    const q = {
      p: msg.parent
    }

    if(msg.child) {
      q.c = msg.child
    }

    if(msg.kind) {
      q.k = msg.kind
    }

    if(msg.code) {
      q.d = msg.code
    }

    const member = await member_ent.load$(q)
    var child = []
    
    if(member && 'child' === msg.as) {
      child = await load_items(seneca, [member], msg, 'c')
    }
    
    return {member: member, child: child[0], q: q}
  }

  
  async function remove_member(msg, reply) {
    const member_ent = this.entity('sys/member')
    var list = []
    
    if(null != msg.id) {
      const item = await member_ent.load$(msg.id)
      if(item) {
        list.push(item)
      }
      await member_ent.make$().remove$(msg.id)
    }
    else if(null != msg.child && null != msg.kind) {
      // required
      const q = {
        c: msg.child,
        k: msg.kind
      }

      if(msg.parent) {
        q.p = msg.parent
      }

      if(msg.code) {
        q.d = msg.code
      }

      const found = await member_ent.list$(q)

      for(var i = 0; i < found.length; i++) {
        list.push(found)
        await found[i].remove$()
      }
    }
    
    return {items:list}
  }
  
  update_member.validate = Object.assign({}, validate_member, {
    id: Joi.string().required(),
  })


  async function update_member(msg, reply) {
    const member_ent = this.entity('sys/member')

    // TODO: remove as replaced by role:member,remove:member
    //if(msg.remove) {
    //  return await member_ent.make$().remove$(msg.id)
    //}
    //else {
      var member = await member_ent.make$().load$(msg.id)

      if(member) {
        member.p = null == msg.parent ? member.p : msg.parent
        member.c = null == msg.child ? member.c : msg.child
        member.k = null == msg.kind ? member.k : msg.kind
        member.d = null == msg.code ? member.d : msg.code
        member.t = null == msg.tags ? member.t : msg.tags
        
        member = await member.save$()
      }

      return member
    //}
  }


  list_children.validate = Object.assign({}, validate_member, {})

  async function list_children(msg, reply) {
    return build_list(this,msg,'c')
  }

  
  list_parents.validate = Object.assign({}, validate_member, {})

  async function list_parents(msg, reply) {
    return build_list(this,msg,'p')
  }


  async function build_list(seneca,msg,type) {
    const member_ent = seneca.entity('sys/member')

    const fields = []
    const q = {}

    if('c' === type && null != msg.parent) {
      q.p = msg.parent
    }
    if('p' === type && null != msg.child) {
      q.c = msg.child
    }
    if(null != msg.kind) {
      q.k = msg.kind
    }
    if(null != msg.code) {
      q.d = msg.code
    }
    
    var list = await member_ent.list$(q)
    
    var seen = {}
    list = list.filter(x => seen[x[type]] ? false : seen[x[type]] = true)

    const prefix = 'c' === type ? 'child' : 'parent'
    
    // Return referenced entity ids
    if(null == msg.as || prefix+'-id' == msg.as) {
      list = list.map(x=>x[type])
    }

    // Return sys/member ids
    else if('member-id' == msg.as) {
      list = list.map(x=>x.id)
    }

    // Return sys/member ents
    else if('member' == msg.as) {
      // use list as is
    }

    // Return referenced entities
    else if(prefix == msg.as) {
      list = await load_items(seneca,list,msg,type)
    }
    
    return {items:list}
  }    

  
  async function load_items(seneca, list, msg, type) {
    const out = []

    for(var i = 0; i < list.length; i++) {
      var kind = list[i].k
      var canon = opts.kinds[kind][type]
      var ent = seneca.entity(canon)
      var entid = list[i][type]

      var q = {id:entid}
      if(msg.fields) {
        q.fields$ = msg.fields
      }

      var found = (await ent.list$(q))[0]
      if(found) {
        out.push(found)
      }
    }

    return out
  }

  return define_patterns()
}

const intern = (module.exports.intern = {
})


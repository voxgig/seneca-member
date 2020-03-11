/* Copyright (c) 2018-2020 voxgig and other contributors, MIT License */
'use strict'

// TODO: ensure tags don't get obliterated
// TODO: check kind has been defined

// const Util = require('util')

const Joi = require('@hapi/joi')

// Semantic Version of sys/member entities
const SYS_MEMBER_SV = 0

module.exports = member

member.defaults = {
  kinds: {}
}

member.errors = {
  invalid_as:
    'Invalid member `as` value (<%=as%>), should be one of: child, parent, child-id, parent-id, member, member-id.'
}

function member(options) {
  const seneca = this

  function define_patterns() {
    seneca
      .message('role:member,add:kinds', add_kinds)
      .message('role:member,get:kinds', get_kinds)
      .message('role:member,add:member', intern.make_multi(add_member))
      .message('role:member,is:member', is_member)
      .message(
        'role:member,remove:member',
        intern.make_multi(remove_member, intern.is_single_remove)
      )
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

  async function add_kinds(msg) {
    options.kinds = Object.assign(options.kinds, msg.kinds)
    return { kinds: options.kinds }
  }

  async function get_kinds(msg) {
    return { kinds: options.kinds }
  }

  // idemptotent
  async function add_member(msg) {
    const member_ent = this.entity('sys/member')

    const q = {
      p: msg.parent,
      c: msg.child,
      k: msg.kind,
      d: msg.code
    }
    const prev = await member_ent.make$().load$(q)

    var member

    if (prev) {
      member = await prev
        .data$({
          t: msg.tags
        })
        .save$()
    } else {
      const data = {
        p: msg.parent,
        c: msg.child,
        k: msg.kind,
        d: msg.code,
        t: msg.tags,
        sv: SYS_MEMBER_SV
      }
      if (msg.id) {
        data.id$ = msg.id
      }

      member = await member_ent
        .make$()
        .data$(data)
        .save$()
    }

    return member
  }

  async function is_member(msg) {
    const member_ent = this.entity('sys/member')

    // required
    const q = {
      p: msg.parent
    }

    var msg_children = intern.resolve_children(msg)
    if (msg_children) {
      q.c = msg_children
    }

    if (msg.kind) {
      q.k = msg.kind
    }

    if (msg.code) {
      q.d = msg.code
    }

    var valid_query = null != q.c || null != q.d

    const members = valid_query ? await member_ent.list$(q) : []
    var children = []

    var membership = {}
    for (var mI = 0; mI < members.length; mI++) {
      membership[members[mI].c] = true
    }

    if (0 < members.length && 'child' === msg.as) {
      children = await intern.load_items(seneca, options, members, msg, 'c')
    }

    var out = {
      q: q,
      member: members[0],
      child: children[0],
      members: members,
      children: children,
      membership: membership
    }

    return out
  }

  async function remove_member(msg) {
    const member_ent = this.entity('sys/member')
    var list = []

    if (null != msg.id) {
      const item = await member_ent.load$(msg.id)
      if (item) {
        list.push(item)
      }
      await member_ent.make$().remove$(msg.id)
    } else if (null != msg.child && null != msg.kind) {
      // required
      const q = {
        c: msg.child,
        k: msg.kind
      }

      if (msg.parent) {
        q.p = msg.parent
      }

      if (msg.code) {
        q.d = msg.code
      }

      const found = await member_ent.list$(q)

      for (var i = 0; i < found.length; i++) {
        list.push(found)
        await found[i].remove$()
      }
    }

    return { items: list }
  }

  async function update_member(msg) {
    const member_ent = this.entity('sys/member')

    // TODO: support list of ids - need seneca-entity to support this
    var member = await member_ent.make$().load$(msg.id)

    if (member) {
      member.p = null == msg.parent ? member.p : msg.parent
      member.c = null == msg.child ? member.c : msg.child
      member.k = null == msg.kind ? member.k : msg.kind
      member.d = null == msg.code ? member.d : msg.code
      member.t = null == msg.tags ? member.t : msg.tags

      member = await member.save$()
    }

    return member
  }

  list_children.validate = Object.assign({}, validate_member, {})

  async function list_children(msg) {
    return build_list(this, msg, 'c')
  }

  list_parents.validate = Object.assign({}, validate_member, {})

  async function list_parents(msg) {
    return build_list(this, msg, 'p')
  }

  async function build_list(seneca, msg, type) {
    const member_ent = seneca.entity('sys/member')

    // const fields = []
    const q = {}

    if ('c' === type && null != msg.parent) {
      q.p = msg.parent
    }
    if ('p' === type && null != msg.child) {
      q.c = msg.child
    }
    if (null != msg.kind) {
      q.k = msg.kind
    }
    if (null != msg.code) {
      q.d = msg.code
    }

    var list = await member_ent.list$(q)

    var seen = {}
    list = list.filter(x => (seen[x[type]] ? false : (seen[x[type]] = true)))

    const prefix = 'c' === type ? 'child' : 'parent'

    // Return referenced entity ids
    if (null == msg.as || prefix + '-id' == msg.as) {
      list = list.map(x => x[type])
    }

    // Return sys/member ids
    else if ('member-id' == msg.as) {
      list = list.map(x => x.id)
    }

    // Return sys/member ents
    else if ('member' == msg.as) {
      // use list as is
    }

    // Return referenced entities
    else if (prefix == msg.as) {
      list = await intern.load_items(seneca, options, list, msg, type)
    } else {
      seneca.fail('invalid_as', { as: msg.as })
    }

    return { items: list }
  }

  return define_patterns()
}

const intern = (module.exports.intern = {
  load_items: async function(seneca, options, list, msg, type) {
    var out = []

    if (0 < list.length) {
      // assume list is all of same kind
      var kind = list[0].k
      var canon = options.kinds[kind][type]
      var ent = seneca.entity(canon)

      var q = { id: list.map(x => x[type]) }
      if (msg.fields) {
        q.fields$ = msg.fields
      }

      out = await ent.list$(q)
    }

    return out
  },

  resolve_children: function(msg) {
    var children = null

    // children has precedence
    if (msg.children) {
      children = msg.children
    } else if (msg.child) {
      children = msg.child
    }

    // always convert to list
    if (null != children && !Array.isArray(children)) {
      children = [children]
    }

    return children
  },

  make_multi: function(single_action, is_single) {
    var func = async function(msg, meta, ...rest) {
      if (msg.child || (is_single && is_single(msg))) {
        return single_action.call(this, msg, meta, ...rest)
      } else if (msg.children) {
        var out = []
        for (var cI = 0; cI < msg.children.length; cI++) {
          var child_msg = { ...msg, child: msg.children[cI], children: null }
          out.push(await single_action.call(this, child_msg, meta, ...rest))
        }
        return out
      }
      // else no action no result
      else {
        return null
      }
    }

    Object.defineProperty(func, 'name', {
      value: single_action.name + '_multi'
    })
    return func
  },

  // The code could be a unique child for the parent.
  is_single_member: function(msg) {
    return !msg.children && !!(msg.child || msg.code)
  },

  is_single_remove: function(msg) {
    return !msg.children && !!(msg.id || msg.child || msg.code)
  }
})

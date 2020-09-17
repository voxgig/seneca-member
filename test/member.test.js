/* Copyright (c) 2018-2020 voxgig and other contributors, MIT License */
'use strict'

// const Util = require('util')

const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const lab = (exports.lab = Lab.script())
const expect = Code.expect

const PluginValidator = require('seneca-plugin-validator')
const Seneca = require('seneca')
const Plugin = require('..')

lab.test('validate', PluginValidator(Plugin, module))

lab.test('happy', async () => {
  await make_instance()
    .gate()
    .act(
      'role:member,add:member',
      {
        parent: 'p0',
        child: 'c0',
        kind: 'group',
        code: 'admin',
        tags: ['foo', 'bar']
      },
      function(err, out) {
        expect(out).exist()
        expect(out).includes({
          p: 'p0',
          c: 'c0',
          k: 'group',
          d: 'admin',
          t: ['foo', 'bar']
        })
      }
    )
    .act(
      'role:member,is:member',
      { parent: 'p0', child: 'c0', kind: 'group' },
      function(err, out) {
        expect(out.member).exists()
      }
    )
    .ready()
})

lab.test('validate', async () => {
  await make_instance({ validate: true })
    .gate()
    .act(
      'role:member,add:member',
      {
        parent: 'p0',
        child: 'c0',
        kind: 'group',
        code: 'admin',
        tags: ['foo', 'bar']
      },
      function(err, out) {
        expect(out).exist()
        expect(out).includes({
          p: 'p0',
          c: 'c0',
          k: 'group',
          d: 'admin',
          t: ['foo', 'bar']
        })
      }
    )
    .act(
      'role:member,is:member',
      { parent: 'p0', child: 'c0', kind: 'group' },
      function(err, out) {
        expect(out.member).exists()
      }
    )
    .ready()
})

lab.test('no-dups', async () => {
  var si = make_instance()
  var out = await si.post('role:member,add:member', {
    parent: 'p0',
    child: 'c0',
    kind: 'group',
    code: 'admin',
    tags: ['foo', 'bar']
  })

  expect(out).exist()
  expect(out).includes({
    p: 'p0',
    c: 'c0',
    k: 'group',
    d: 'admin',
    t: ['foo', 'bar']
  })
  const id = out.id

  out = await si.post('role:member,add:member', {
    parent: 'p0',
    child: 'c0',
    kind: 'group',
    code: 'admin',
    tags: ['zed']
  })

  expect(out).exist()
  expect(out).includes({ p: 'p0', c: 'c0', k: 'group', d: 'admin', t: ['zed'] })
  expect(out.id).equals(id)
})

lab.test('list-children', async () => {
  var si = await make_data0(make_instance())
  var out

  out = await si.post('role:member,list:children')
  expect(out.items).equal(['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6'])

  out = await si.post('role:member,list:children,parent:p0')
  expect(out.items).equal(['c0', 'c1', 'c2', 'c3'])

  out = await si.post('role:member,list:children,parent:p3')
  expect(out.items).equal(['c5', 'c6'])

  out = await si.post('role:member,list:children,parent:p0,kind:k0')
  expect(out.items).equal(['c0', 'c1', 'c2'])

  out = await si.post('role:member,list:children,parent:p0,kind:k0,code:d0')
  expect(out.items).equal(['c0', 'c1'])

  out = await si.post(
    'role:member,list:children,parent:p0,kind:k0,code:d0,as:child-id'
  )
  expect(out.items).equal(['c0', 'c1'])

  out = await si.post(
    'role:member,list:children,parent:p0,kind:k0,code:d0,as:member-id'
  )
  expect(out.items).equal(['m0', 'm1'])

  out = await si.post(
    'role:member,list:children,parent:p0,kind:k0,code:d0,as:member'
  )
  expect(out.items.map(x => x.id)).equal(['m0', 'm1'])

  out = await si.post(
    'role:member,list:children,parent:p0,kind:k0,code:d0,as:child'
  )
  expect(out.items[0].toString()).equal('$-/-/bar;id=c0;{f2:100,f3:A}')
  expect(out.items[1].toString()).equal('$-/-/bar;id=c1;{f2:101,f3:B}')

  // just get child ids
  out = await si.post('role:member,list:children,parent:p0,kind:k0,code:d0')
  //console.log(out)
  expect(out).equal({ items: ['c0', 'c1'] })

  try {
    await si.post(
      'role:member,list:children,parent:p0,kind:k0,code:d0,as:not-a-valid-thing'
    )
    Code.fail()
  } catch (e) {
    expect(e.code).equal('invalid_as')
  }

  out = await si.post(
    'role:member,is:member,parent:p0,child:c0,as:child,fields:["f2"]'
  )
  expect(out.q).equal({ p: 'p0', c: ['c0'] })
  expect(out.member.toString()).equal(
    '$-/sys/member;id=m0;{p:p0,c:c0,k:k0,d:d0,t:[t0],sv:0}'
  )
  expect(out.child.toString()).equal('$-/-/bar;id=c0;{f2:100}')

  // assume code is unique
  out = await si.post(
    'role:member,is:member,parent:p0,code:d0,as:child,fields:["f2"]'
  )
  expect(out.q).equal({ p: 'p0', d: 'd0' })
  expect(out.member.toString()).equal(
    '$-/sys/member;id=m0;{p:p0,c:c0,k:k0,d:d0,t:[t0],sv:0}'
  )
  expect(out.child.toString()).equal('$-/-/bar;id=c0;{f2:100}')

  // child and code
  out = await si.post(
    'role:member,is:member,parent:p0,child:c0,code:d0,as:child,fields:["f2"]'
  )
  expect(out.member.toString()).equal(
    '$-/sys/member;id=m0;{p:p0,c:c0,k:k0,d:d0,t:[t0],sv:0}'
  )

  // nothing can match this
  out = await si.post('role:member,is:member,parent:p0,as:child,fields:["f2"]')
  expect(out).equal({
    q: { p: 'p0' },
    member: undefined,
    child: undefined,
    members: [],
    children: [],
    membership: {}
  })

  out = await si.post(
    'role:member,is:member,parent:p3,children:["c4","c5","c6"]'
  )
  //console.log(out)
  //expect(out.map(x => !!x.member)).equal([false, true, true])
  expect(out.membership).equals({ c5: true, c6: true })

  out = await si.post('role:member,list:children,parent:not-a-parent')
  expect(out.items).equal([])

  out = await si.post('role:member,list:children,parent:p0,kind:not-a-kind')
  expect(out.items).equal([])

  out = await si.post(
    'role:member,list:children,parent:p0,kind:k0,code:not-a-code'
  )
  expect(out.items).equal([])
})

lab.test('list-parents', async () => {
  var si = await make_data0(make_instance())
  var out

  out = await si.post('role:member,list:parents')
  expect(out.items).equal(['p0', 'p1', 'p2', 'p3'])

  out = await si.post('role:member,list:parents,child:c0')
  expect(out.items).equal(['p0', 'p1'])

  out = await si.post('role:member,list:parents,child:c2')
  expect(out.items).equal(['p0', 'p2'])

  out = await si.post('role:member,list:parents,child:c0,kind:k0')
  expect(out.items).equal(['p0', 'p1'])

  out = await si.post('role:member,list:parents,child:c0,kind:k0,code:d0')
  expect(out.items).equal(['p0', 'p1'])

  out = await si.post(
    'role:member,list:parents,child:c0,kind:k0,code:d0,as:parent-id'
  )
  expect(out.items).equal(['p0', 'p1'])

  out = await si.post(
    'role:member,list:parents,child:c0,kind:k0,code:d0,as:member-id'
  )
  expect(out.items).equal(['m0', 'm4'])

  out = await si.post(
    'role:member,list:parents,child:c0,kind:k0,code:d0,as:member'
  )
  expect(out.items.map(x => x.id)).equal(['m0', 'm4'])

  out = await si.post(
    'role:member,list:parents,child:c0,kind:k0,code:d0,as:parent'
  )
  expect(out.items[0].toString()).equal('$-/-/foo;id=p0;{f0:0,f1:a}')
  expect(out.items[1].toString()).equal('$-/-/foo;id=p1;{f0:1,f1:b}')

  out = await si.post(
    'role:member,list:all,kind:k0,code:d0'
  )
  expect(out.items.length).equal(4)
  //console.log(out)
})

// TODO: mem-store needs to support fields$
// TODO: add to standard entity tests
lab.test('fields', async () => {
  var si = await make_data0(make_instance())
  var out

  out = await si.post(
    'role:member,list:children,parent:p0,kind:k0,code:d0,as:child',
    { fields: ['f2'] }
  )
  expect(out.items[0].toString()).equal('$-/-/bar;id=c0;{f2:100}')
  expect(out.items[1].toString()).equal('$-/-/bar;id=c1;{f2:101}')

  out = await si.post(
    'role:member,list:parents,child:c0,kind:k0,code:d0,as:parent',
    { fields: ['f1'] }
  )
  expect(out.items[0].toString()).equal('$-/-/foo;id=p0;{f1:a}')
  expect(out.items[1].toString()).equal('$-/-/foo;id=p1;{f1:b}')
})

lab.test('bad-update', async () => {
  const si = make_instance({ validate: true })
  si.quiet && si.quiet()

  try {
    await si.post('role:member,add:member', {
      id: 'm0',
      parent: 'p0',
      child: 'c0'
    })
    Code.fail('should-not-pass')
  } catch (e) {
    expect(e.code).equal('act_invalid_msg')
  }
})

lab.test('update', async () => {
  const si = make_instance({ validate: true })

  const m0 = await si.post('role:member,add:member', {
    id: 'm0',
    parent: 'p0',
    child: 'c0',
    kind: 'k0',
    code: 'd0',
    tags: ['t0']
  })

  expect(m0.d).equals('d0')
  expect(m0.t).equals(['t0'])

  const m0x = await si.post('role:member,update:member', {
    id: m0.id,
    code: 'd0x',
    tags: ['t0x']
  })

  expect(m0x.d).equals('d0x')
  expect(m0x.t).equals(['t0x'])
  expect(m0x.p).equals('p0')
  expect(m0x.c).equals('c0')
  expect(m0x.k).equals('k0')

  const m0x2 = await si.post('role:member,update:member', {
    id: m0.id,
    parent: 'p1',
    child: 'c1',
    kind: 'k1'
  })

  expect(m0x2.d).equals('d0x')
  expect(m0x2.t).equals(['t0x'])
  expect(m0x2.p).equals('p1')
  expect(m0x2.c).equals('c1')
  expect(m0x2.k).equals('k1')

  var rmlist = await si.post('role:member,remove:member', { id: m0.id })
  expect(rmlist.items[0].id).equals(m0.id)

  rmlist = await si.post('role:member,remove:member', { id: m0.id })
  expect(rmlist.items.length).equals(0)

  const m0xr = await si.post('role:member,update:member', { id: m0.id })

  expect(m0xr).not.exist()
})

lab.test('remove', async () => {
  const si = make_instance()

  const m0 = await si.post('role:member,add:member', {
    id: 'm0',
    parent: 'p0',
    child: 'c0',
    kind: 'k0',
    code: 'd0',
    tags: ['a', 'b']
  })
  expect(m0.data$()).equal({
    entity$: { zone: undefined, base: 'sys', name: 'member' },
    p: 'p0',
    c: 'c0',
    k: 'k0',
    d: 'd0',
    t: ['a', 'b'],
    sv: 0,
    id: 'm0'
  })

  const m1 = await si.post('role:member,add:member', {
    id: 'm1',
    parent: 'p0',
    child: 'c1',
    kind: 'k0',
    code: 'd0'
  })
  expect(m1.data$()).equal({
    entity$: { zone: undefined, base: 'sys', name: 'member' },
    p: 'p0',
    c: 'c1',
    k: 'k0',
    d: 'd0',
    sv: 0,
    id: 'm1'
  })

  var list = await si.post('role:member,list:children,parent:p0')
  expect(list.items).equal(['c0', 'c1'])

  // noop
  await si.post('role:member,remove:member,child:c0')
  expect(list.items).equal(['c0', 'c1'])

  // noop
  await si.post('role:member,remove:member,kind:k0')
  expect(list.items).equal(['c0', 'c1'])

  await si.post('role:member,remove:member,child:c0,kind:k0')

  list = await si.post('role:member,list:children,parent:p0')
  expect(list.items).equal(['c1'])

  // multiple parents, specific code

  await si.post('role:member,add:member', {
    id: 'm2a',
    parent: 'p1',
    child: 'c2',
    kind: 'k1',
    code: 'd1'
  })
  await si.post('role:member,add:member', {
    id: 'm2b',
    parent: 'p2',
    child: 'c2',
    kind: 'k1',
    code: 'd1'
  })
  await si.post('role:member,add:member', {
    id: 'm2c',
    parent: 'p3',
    child: 'c3',
    kind: 'k1',
    code: 'd1'
  })

  list = await si.post('role:member,list:parents,child:c2,kind:k1,code:d1')
  expect(list.items).equal(['p1', 'p2'])

  await si.post('role:member,remove:member,child:c2,kind:k1,code:d1')

  list = await si.post('role:member,list:children,parent:p1')
  expect(list.items).equal([])

  list = await si.post('role:member,list:children,parent:p2')
  expect(list.items).equal([])

  // won't delete if not enough info

  list = await si.post('role:member,list:children,parent:p3')
  expect(list.items).equal(['c3'])

  await si.post(
    'role:member,remove:member,parent:p3,child:not-c3,kind:k1,code:d1'
  )

  list = await si.post('role:member,list:children,parent:p3')
  expect(list.items).equal(['c3'])

  await si.post('role:member,remove:member,parent:p3,kind:k1,code:d1')

  list = await si.post('role:member,list:children,parent:p3')
  expect(list.items).equal(['c3'])
})

lab.test('kinds', async () => {
  var si = await make_instance({ validate: true })
  var out

  out = await si.post('role:member,add:kinds', {
    kinds: { ak0: { p: 'p0', c: 'c0' }, ak1: { p: 'p0', c: 'c1' } }
  })
  expect(out).exist()
  expect(out).includes({
    kinds: {
      k0: { p: 'foo', c: 'bar' },
      k1: { p: 'foo', c: 'zed' },
      ak0: { p: 'p0', c: 'c0' },
      ak1: { p: 'p0', c: 'c1' }
    }
  })

  out = await si.post('role:member,get:kinds')
  expect(out).exist()
  expect(out).includes({
    kinds: {
      k0: { p: 'foo', c: 'bar' },
      k1: { p: 'foo', c: 'zed' },
      ak0: { p: 'p0', c: 'c0' },
      ak1: { p: 'p0', c: 'c1' }
    }
  })

  try {
    si.quiet()
    await si.post('role:member,add:kinds', {
      kinds: { k2: {} }
    })
    Code.fail('should-not-pass')
  } catch (e) {
    expect(e.message).equals(
      "seneca: Action add:kinds,role:member received an invalid message; \"kinds.k2.p\" is required; message content was: { kinds: { k2: {} }, role: 'member', add: 'kinds' }."
    )
  }
})

lab.test('intern', async () => {
  expect(Plugin.intern).exists()

  expect(await Plugin.intern.load_items(null, null, [])).equals([])

  expect(Plugin.intern.is_single_member({})).false()
  expect(Plugin.intern.is_single_member({ children: [] })).false()
  expect(Plugin.intern.is_single_member({ child: 1 })).true()
  expect(Plugin.intern.is_single_member({ code: 2 })).true()
  expect(Plugin.intern.is_single_member({ child: 1, code: 2 })).true()

  expect(Plugin.intern.is_single_remove({})).false()
  expect(Plugin.intern.is_single_remove({ children: [] })).false()
  expect(Plugin.intern.is_single_remove({ child: 1 })).true()
  expect(Plugin.intern.is_single_remove({ code: 2 })).true()
  expect(Plugin.intern.is_single_remove({ child: 1, code: 2 })).true()
  expect(Plugin.intern.is_single_remove({ id: 'id0' })).true()
})

async function make_data0(si) {
  const foo_ent = si.entity('foo')
  const bar_ent = si.entity('bar')
  const zed_ent = si.entity('zed')

  await foo_ent
    .make$()
    .data$({ id$: 'p0', f0: 0, f1: 'a' })
    .save$()
  await foo_ent
    .make$()
    .data$({ id$: 'p1', f0: 1, f1: 'b' })
    .save$()
  await foo_ent
    .make$()
    .data$({ id$: 'p2', f0: 2, f1: 'c' })
    .save$()

  await bar_ent
    .make$()
    .data$({ id$: 'c0', f2: 100, f3: 'A' })
    .save$()
  await bar_ent
    .make$()
    .data$({ id$: 'c1', f2: 101, f3: 'B' })
    .save$()
  await bar_ent
    .make$()
    .data$({ id$: 'c2', f2: 102, f3: 'C' })
    .save$()
  await bar_ent
    .make$()
    .data$({ id$: 'c3', f2: 103, f3: 'D' })
    .save$()

  await zed_ent
    .make$()
    .data$({ id$: 'c4', f4: 1000, f5: 'aa' })
    .save$()

  const m0 = await si.post('role:member,add:member', {
    id: 'm0',
    parent: 'p0',
    child: 'c0',
    kind: 'k0',
    code: 'd0',
    tags: ['t0']
  })

  const m1 = await si.post('role:member,add:member', {
    id: 'm1',
    parent: 'p0',
    child: 'c1',
    kind: 'k0',
    code: 'd0',
    tags: ['t0', 't1']
  })

  const m2 = await si.post('role:member,add:member', {
    id: 'm2',
    parent: 'p0',
    child: 'c2',
    kind: 'k0',
    code: 'd1',
    tags: ['t1', 't2']
  })

  const m3 = await si.post('role:member,add:member', {
    id: 'm3',
    parent: 'p0',
    child: 'c3',
    kind: 'k1',
    code: 'd2',
    tags: ['t0']
  })

  const m4 = await si.post('role:member,add:member', {
    id: 'm4',
    parent: 'p1',
    child: 'c0',
    kind: 'k0',
    code: 'd0',
    tags: ['t0']
  })

  const m5 = await si.post('role:member,add:member', {
    id: 'm5',
    parent: 'p1',
    child: 'c4',
    kind: 'k0',
    code: 'd0',
    tags: ['t1']
  })

  const m6 = await si.post('role:member,add:member', {
    id: 'm6',
    parent: 'p2',
    child: 'c2',
    kind: 'k2',
    code: 'd3',
    tags: ['t3']
  })

  var ma0 = await si.post('role:member,add:member', {
    parent: 'p3',
    children: ['c5', 'c6'],
    kind: 'k3',
    code: 'd4',
    tags: ['t4', 't5']
  })
  expect(ma0.length).equals(2)

  expect(
    await si.post('role:member,add:member', {
      parent: '~',
      kind: '~',
      code: '~'
    })
  ).equal(null)

  expect(m0).exists()
  expect(m1).exists()
  expect(m2).exists()
  expect(m3).exists()
  expect(m4).exists()
  expect(m5).exists()
  expect(m6).exists()

  return si
}

function make_instance(flags) {
  flags = flags || {}
  var si = Seneca()
    .test()
    .use('promisify')

  if (flags.validate) {
    si.use('seneca-doc').use('seneca-joi')
  }

  return si.use('entity').use('..', {
    kinds: {
      k0: {
        p: 'foo',
        c: 'bar'
      },
      k1: {
        p: 'foo',
        c: 'zed'
      }
    }
  })
}

/* Copyright (c) 2018 voxgig and other contributors, MIT License */
'use strict'

const Util = require('util')

const Lab = require('lab')
const Code = require('code')
const lab = (exports.lab = Lab.script())
const expect = Code.expect

const PluginValidator = require('seneca-plugin-validator')
const Seneca = require('seneca')
const Plugin = require('..')


const W = Util.promisify


lab.test('validate', PluginValidator(Plugin, module))

lab.test('happy', fin => {
  make_instance(fin)
    .gate()
    .act('role:member,add:member',
         {parent:'p0', child:'c0', kind:'group', code:'admin', tags:['foo','bar']},
         function(err, out) {
           expect(out).exist()
           expect(out).includes({p:'p0',c:'c0',k:'group',d:'admin',t:['foo','bar']})
         })
    .act('role:member,is:member',
         {parent:'p0', child:'c0', kind:'group'},
         function(err, out) {
           expect(out.member).true()
         })
    .ready(fin)
})

lab.test('no-dups', fin => {
  make_instance(fin)
    .act('role:member,add:member',
         {parent:'p0', child:'c0', kind:'group', code:'admin', tags:['foo','bar']},
         function(err, out) {
           expect(out).exist()
           expect(out).includes({p:'p0',c:'c0',k:'group',d:'admin',t:['foo','bar']})
           const id = out.id

           this
             .act(
               'role:member,add:member',
               {parent:'p0', child:'c0',
                kind:'group', code:'admin', tags:['zed']},
               function(err, out) {
                 expect(out).exist()
                 expect(out)
                   .includes({p:'p0',c:'c0',k:'group',d:'admin',t:['zed']})
                 expect(out.id).equals(id)

                 fin()
               })
         })
})


lab.test('list-children', fin => {
  make_data0(make_instance(fin), function(si) {
    si
      .gate()

      .act('role:member,list:children', function(err, out) {
        expect(out.items).equal([ 'c0', 'c1', 'c2', 'c3', 'c4' ])
      })
      .act('role:member,list:children,parent:p0', function(err, out) {
        expect(out.items).equal([ 'c0', 'c1', 'c2', 'c3' ])
      })
      .act('role:member,list:children,parent:p0,kind:k0', function(err, out) {
        expect(out.items).equal([ 'c0', 'c1', 'c2' ])
      })
      .act('role:member,list:children,parent:p0,kind:k0,code:d0', function(err, out) {
        expect(out.items).equal([ 'c0', 'c1' ])
      })

      .act('role:member,list:children,parent:p0,kind:k0,code:d0,as:child-id', function(err, out) {
        expect(out.items).equal([ 'c0', 'c1' ])
      })
      .act('role:member,list:children,parent:p0,kind:k0,code:d0,as:member-id', function(err, out) {
        expect(out.items).equal([ 'm0', 'm1' ])
      })
      .act('role:member,list:children,parent:p0,kind:k0,code:d0,as:member', function(err, out) {
        expect(out.items.map(x=>x.id)).equal([ 'm0', 'm1' ])
      })

      .act('role:member,list:children,parent:p0,kind:k0,code:d0,as:child', function(err, out) {
        expect(out.items[0].toString()).equal('$-/-/bar;id=c0;{f2:100,f3:A}')
        expect(out.items[1].toString()).equal('$-/-/bar;id=c1;{f2:101,f3:B}')
      })

      .act('role:member,list:children,parent:not-a-parent', function(err, out) {
        expect(out.items).equal([])
      })
      .act('role:member,list:children,parent:p0,kind:not-a-kind', function(err, out) {
        expect(out.items).equal([])
      })
      .act('role:member,list:children,parent:p0,kind:k0,code:not-a-code', function(err, out) {
        expect(out.items).equal([])
      })

    
      .ready(fin)
  })
})


lab.test('list-parents', fin => {
  make_data0(make_instance(fin), function(si) {
    si
      .gate()

      .act('role:member,list:parents', function(err, out) {
        expect(out.items).equal([ 'p0', 'p1', 'p2' ])
      })

      .act('role:member,list:parents,child:c0', function(err, out) {
        expect(out.items).equal([ 'p0', 'p1' ])
      })

      .act('role:member,list:parents,child:c2', function(err, out) {
        expect(out.items).equal([ 'p0', 'p2' ])
      })


      .act('role:member,list:parents,child:c0,kind:k0', function(err, out) {
        expect(out.items).equal([ 'p0', 'p1' ])
      })
      .act('role:member,list:parents,child:c0,kind:k0,code:d0', function(err, out) {
        expect(out.items).equal([ 'p0', 'p1' ])
      })


      .act('role:member,list:parents,child:c0,kind:k0,code:d0,as:parent-id', function(err, out) {
        expect(out.items).equal([ 'p0', 'p1' ])
      })
      .act('role:member,list:parents,child:c0,kind:k0,code:d0,as:member-id', function(err, out) {
        expect(out.items).equal([ 'm0', 'm4' ])
      })
      .act('role:member,list:parents,child:c0,kind:k0,code:d0,as:member', function(err, out) {
        expect(out.items.map(x=>x.id)).equal([ 'm0', 'm4' ])
      })

      .act('role:member,list:parents,child:c0,kind:k0,code:d0,as:parent', function(err, out) {
        expect(out.items[0].toString()).equal('$-/-/foo;id=p0;{f0:0,f1:a}')
        expect(out.items[1].toString()).equal('$-/-/foo;id=p1;{f0:1,f1:b}')
      })

      .ready(fin)
  })
})


// TODO: mem-store needs to support fields$
// TODO: add to standard entity tests
lab.test('fields', fin => {
  make_data0(make_instance(fin), function(si) {
    si
      .gate()

      .act(
        'role:member,list:children,parent:p0,kind:k0,code:d0,as:child',
        {fields:['f2']},
        function(err, out) {
          expect(out.items[0].toString()).equal('$-/-/bar;id=c0;{f2:100}')
          expect(out.items[1].toString()).equal('$-/-/bar;id=c1;{f2:101}')
        })

      .act(
        'role:member,list:parents,child:c0,kind:k0,code:d0,as:parent',
        {fields:['f1']},
        function(err, out) {
          expect(out.items[0].toString()).equal('$-/-/foo;id=p0;{f1:a}')
          expect(out.items[1].toString()).equal('$-/-/foo;id=p1;{f1:b}')
        })

      .ready(fin)
  })
})


lab.test('update', fin => {
  const si = make_instance(fin)
  const act = W(si.act.bind(si))
  
  work().then(fin).catch(fin)

  async function work() {  
    const m0 = await act(
      'role:member,add:member',
      {id:'m0', parent:'p0', child:'c0', kind:'k0', code:'d0', tags:['t0']})

    expect(m0.d).equals('d0')
    expect(m0.t).equals(['t0'])
    
    const m0x = await act(
      'role:member,update:member',
      {id:m0.id, code:'d0x', tags:['t0x']})
    
    expect(m0x.d).equals('d0x')
    expect(m0x.t).equals(['t0x'])
    expect(m0x.p).equals('p0')
    expect(m0x.c).equals('c0')
    expect(m0x.k).equals('k0')

    
    const m0x2 = await act(
      'role:member,update:member',
      {id:m0.id, parent:'p1', child:'c1', kind:'k1' })
    
    expect(m0x2.d).equals('d0x')
    expect(m0x2.t).equals(['t0x'])
    expect(m0x2.p).equals('p1')
    expect(m0x2.c).equals('c1')
    expect(m0x2.k).equals('k1')

    
    await act(
      'role:member,update:member,remove:true',
      {id:m0.id})

    const m0xr = await act(
      'role:member,update:member',
      {id:m0.id})

    expect(m0xr).not.exist()
  }
})


lab.test('remove', fin => {
  const si = make_instance(fin)
  const act = W(si.act.bind(si))
  
  work().then(fin).catch(fin)

  async function work() {  
    const m0 = await act(
      'role:member,add:member',
      {id:'m0', parent:'p0', child:'c0', kind:'k0', code:'d0'})

    const m1 = await act(
      'role:member,add:member',
      {id:'m1', parent:'p0', child:'c1', kind:'k0', code:'d0'})

    var list = await act('role:member,list:children,parent:p0')
    expect(list.items).equal(['c0', 'c1'])

    await act('role:member,remove:member,child:c0,kind:k0')

    list = await act('role:member,list:children,parent:p0')
    expect(list.items).equal(['c1'])

    
    // multiple parents, specific code

    await act(
      'role:member,add:member',
      {id:'m2a', parent:'p1', child:'c2', kind:'k1', code:'d1'})
    await act(
      'role:member,add:member',
      {id:'m2b', parent:'p2', child:'c2', kind:'k1', code:'d1'})

    list = await act('role:member,list:parents,child:c2,kind:k1,code:d1')
    expect(list.items).equal(['p1','p2'])

    await act('role:member,remove:member,child:c2,kind:k1,code:d1')

    list = await act('role:member,list:children,parent:p1')
    expect(list.items).equal([])

    list = await act('role:member,list:children,parent:p2')
    expect(list.items).equal([])
  }
})


lab.test('kinds', fin => {
  make_instance(fin)
    .gate()
    .act('role:member,add:kinds',
         {kinds: { ak0: {p:'p0', c:'c0'}, ak1: {p:'p0', c:'c1'} }},
         function(err, out) {
           expect(out).exist()
           expect(out).includes({
             kinds: { k0: { p: 'foo', c: 'bar' },
                      k1: { p: 'foo', c: 'zed' },
                      ak0: { p: 'p0', c: 'c0' },
                      ak1: { p: 'p0', c: 'c1' } } })
         })
    .act('role:member,get:kinds',
         function(err, out) {
           expect(out).exist()
           expect(out).includes({
             kinds: { k0: { p: 'foo', c: 'bar' },
                      k1: { p: 'foo', c: 'zed' },
                      ak0: { p: 'p0', c: 'c0' },
                      ak1: { p: 'p0', c: 'c1' } } })
         })
    .ready(fin)
})




lab.test('intern', fin => {
  expect(Plugin.intern).exists()
  fin()
})


function make_data0(si, done) {
  const act = W(si.act.bind(si))
  const foo_ent = WE(si.make('foo'))
  const bar_ent = WE(si.make('bar'))
  const zed_ent = WE(si.make('zed'))
  
  work().then(done).catch(done)

  async function work() {
    await foo_ent.make$().data$({id$:'p0',f0:0,f1:'a'}).save$()
    await foo_ent.make$().data$({id$:'p1',f0:1,f1:'b'}).save$()
    await foo_ent.make$().data$({id$:'p2',f0:2,f1:'c'}).save$()

    await bar_ent.make$().data$({id$:'c0',f2:100,f3:'A'}).save$()
    await bar_ent.make$().data$({id$:'c1',f2:101,f3:'B'}).save$()
    await bar_ent.make$().data$({id$:'c2',f2:102,f3:'C'}).save$()
    await bar_ent.make$().data$({id$:'c3',f2:103,f3:'D'}).save$()

    await zed_ent.make$().data$({id$:'c4',f4:1000,f5:'aa'}).save$()
    
    const m0 = await act(
      'role:member,add:member',
      {id:'m0', parent:'p0', child:'c0', kind:'k0', code:'d0', tags:['t0']})

    const m1 = await act(
      'role:member,add:member',
      {id:'m1', parent:'p0', child:'c1', kind:'k0', code:'d0', tags:['t0','t1']})

    const m2 = await act(
      'role:member,add:member',
      {id:'m2', parent:'p0', child:'c2', kind:'k0', code:'d1', tags:['t1','t2']})

    const m3 = await act(
      'role:member,add:member',
      {id:'m3', parent:'p0', child:'c3', kind:'k1', code:'d2', tags:['t0']})

    const m4 = await act(
      'role:member,add:member',
      {id:'m4', parent:'p1', child:'c0', kind:'k0', code:'d0', tags:['t0']})

    const m5 = await act(
      'role:member,add:member',
      {id:'m5', parent:'p1', child:'c4', kind:'k0', code:'d0', tags:['t1']})

    const m6 = await act(
      'role:member,add:member',
      {id:'m6', parent:'p2', child:'c2', kind:'k2', code:'d3', tags:['t3']})

    return si
  }
}



function make_instance(fin) {
  return Seneca()
    .test(fin)
    .use('entity')
    .use(Plugin, {
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


function WE(ent) {
  ent.load$ = W(ent.load$.bind(ent))
  ent.save$ = W(ent.save$.bind(ent))
  ent.list$ = W(ent.list$.bind(ent))
  ent.remove$ = W(ent.remove$.bind(ent))
  return ent
}

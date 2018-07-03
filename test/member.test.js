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

lab.test('validate', PluginValidator(Plugin, module))

lab.test('happy', fin => {
  make_instance(fin)
    .act('role:member,cmd:add',
         {parent:'p0', child:'c0', kind:'group', code:'admin', tags:['foo','bar']},
         function(err, out) {
           expect(out).exist()
           expect(out).includes({p:'p0',c:'c0',k:'group',d:'admin',t:['foo','bar']})
           fin()
         })
})

lab.test('no-dups', fin => {
  make_instance(fin)
    .act('role:member,cmd:add',
         {parent:'p0', child:'c0', kind:'group', code:'admin', tags:['foo','bar']},
         function(err, out) {
           expect(out).exist()
           expect(out).includes({p:'p0',c:'c0',k:'group',d:'admin',t:['foo','bar']})
           const id = out.id

           this
             .act(
               'role:member,cmd:add',
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


lab.test('intern', fin => {
  expect(Plugin.intern).exists()
  fin()
})


function make_instance(fin) {
  return Seneca()
    .test(fin)
    .use('entity')
    .use(Plugin, {
    })
}

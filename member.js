/* Copyright (c) 2018 voxgig and other contributors, MIT License */
'use strict'

const Util = require('util')

const Optioner = require('optioner')
const Eraro = require('eraro')

const Joi = Optioner.Joi

var Errors = require('./lib/errors')

const W = Util.promisify


const optioner = Optioner({
})

var error = (exports.error = Eraro({
  package: 'seneca',
  msgmap: Errors,
  override: true
}))

module.exports = function member(options) {
  const seneca = this
  const opts = optioner.check(options)

  seneca
    .add('role:member,cmd:add', cmd_add)

  
  function cmd_add(msg, reply) {
    const seneca = this
    work().then(reply).catch(reply)
  
    async function work() {
      const member_ent = WE(seneca.make('sys/member'))

      const prev = await member_ent.make$().load$({
        p: msg.parent,
        c: msg.child,
        k: msg.kind,
        d: msg.code,
      })

      var member
      
      if(prev) {
        member = await WE(prev).data$({
          t: msg.tags
        }).save$()
      }
      else {
        member = await WE(member_ent.make$()).data$({
          p: msg.parent,
          c: msg.child,
          k: msg.kind,
          d: msg.code,
          t: msg.tags
        }).save$()
      }

      return member
    }
  }
  
  
  return {
    export: {
    }
  }
}

const intern = (module.exports.intern = {
})


function WE(ent) {
  const make = ent.make$
  ent.make$ = function() {
    return WE(make.apply(ent,arguments))
  }
  ent.load$ = W(ent.load$.bind(ent))
  ent.save$ = W(ent.save$.bind(ent))
  ent.list$ = W(ent.list$.bind(ent))
  ent.remove$ = W(ent.remove$.bind(ent))
  return ent
}

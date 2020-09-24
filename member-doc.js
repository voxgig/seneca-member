const Joi = require('@hapi/joi')

// TODO: complete docs and validations

const validate_member = {
  parent: Joi.string().description('Parent entity identifier.'),
  child: Joi.string().description('Child entity identifier.'),
  kind: Joi.string(),
  code: Joi.string(),
  tags: Joi.array().items(Joi.string()),
}

module.exports = {
  add_kinds: {
    desc: 'Add parent and child entity types.',
    validate: {
      kinds: Joi.object().pattern(
        /./,
        Joi.object().unknown(false).keys({
          p: Joi.string().required(),
          c: Joi.string().required(),
        })
      ),
    },
  },

  add_member_multi: {
    desc:
      'Add child (id) to parent (id) under relationship `kind` (idempotent).',
    validate: Object.assign({}, validate_member, {
      parent: Joi.string().required().description('Parent entity identifier.'),
      child: Joi.string()
        //.required()
        .description('Child entity identifier.'),
      children: Joi.array()
        .items(Joi.string())
        //.required()
        .description('Child entity identifiers (optional).'),
      kind: Joi.string().required(),
    }),
  },

  is_member_multi: {
    validate: Object.assign({}, validate_member, {
      parent: Joi.string().required(),
    }),
  },

  update_member: {
    validate: Object.assign({}, validate_member, {
      id: Joi.string().required(),
    }),
  },

  remove_member: {
    validate: Object.assign({}, validate_member, {
      id: Joi.string(),
      // TODO: Joi OR
      child: Joi.string(),
      kind: Joi.string(),
    }),
  },
}

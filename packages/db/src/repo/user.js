import { ManagedRepo, cleanDocument } from '@parameter1/mongodb';
import Joi, { validateAsync } from '@parameter1/joi';
import userAttrs from '../schema/attributes/user.js';

export default class UserRepo extends ManagedRepo {
  /**
   *
   * @param {object} params
   */
  constructor(params = {}) {
    super({
      ...params,
      collectionName: 'users',
      collatableFields: ['email.address', 'name.family'],
      indexes: [
        { key: { 'email.address': 1 }, unique: true, collation: { locale: 'en_US' } },

        { key: { 'name.family': 1, _id: 1 }, collation: { locale: 'en_US' } },
        { key: { 'date.created': 1, _id: 1 } },
        { key: { 'date.updated': 1, _id: 1 } },
      ],
    });
  }

  /**
   * @param {object} params
   * @param {string} params.email
   * @param {string} [params.givenName]
   * @param {string} [params.familyName]
   * @param {boolean} [params.verified]
   * @param {object} [params.options]
   */
  async create(params = {}) {
    const {
      email,
      familyName,
      givenName,
      verified,
      options,
    } = await validateAsync(Joi.object({
      email: userAttrs.email.required(),
      familyName: userAttrs.familyName.allow(null).empty(null),
      givenName: userAttrs.givenName.allow(null).empty(null),
      verified: userAttrs.verified.default(false),
      options: Joi.object().default({}),
    }).required(), params);

    const now = new Date();
    return this.insertOne({
      doc: cleanDocument({
        email: {
          address: email,
          domain: email.split('@')[1],
        },
        name: {
          given: givenName,
          family: familyName,
          full: [familyName, givenName].filter((v) => v).join(' '),
        },
        verified,
        loginCount: 0,
        date: { created: now, updated: now },
      }),
      options,
    });
  }
}

import { isFunction as isFn, objectHasKeys } from '@parameter1/utils';
import { PropTypes, validateAsync } from '@sso/prop-types';
import { get } from '@parameter1/object-path';

import AbstractManagementRepo from './-abstract.js';
import {
  contextSchema,
  organizationProps,
  tokenProps,
  userEventProps,
  userProps,
  userSchema,
} from '../../schema/index.js';
import Expr from '../../pipelines/utils/expr.js';

const {
  $addToSet,
  $inc,
  $pull,
  $mergeArrayObject,
} = Expr;

const {
  boolean,
  func,
  object,
  string,
} = PropTypes;

export default class UserRepo extends AbstractManagementRepo {
  /**
   *
   * @param {object} params
   */
  constructor(params = {}) {
    super({
      ...params,
      collectionName: 'users',
      collatableFields: [],
      indexes: [
        { key: { email: 1 }, unique: true },
        { key: { 'organizations._id': 1 } },
        { key: { 'workspaces._id': 1 } },

        { key: { givenName: 1, familyName: 1, _id: 1 }, collation: { locale: 'en_US' } },
        { key: { familyName: 1, givenName: 1, _id: 1 }, collation: { locale: 'en_US' } },
      ],
      schema: userSchema,
    });
  }

  /**
   * Adds an organization manager for the provided user and org IDs.
   *
   * @param {object} params
   * @param {ObjectId|string} params.userId
   * @param {ObjectId|string} params.orgId
   * @param {string} params.role
   * @param {object} [params.session]
   * @param {object} [params.context]
   * @returns
   */
  async manageOrg(params) {
    const {
      userId,
      orgId,
      role,
      session,
      context,
    } = await validateAsync(object({
      userId: userProps.id.required(),
      orgId: organizationProps.id.required(),
      role: organizationProps.managerRole.required(),
      session: object(),
      context: contextSchema,
    }).required(), params);

    return this.update({
      filter: { _id: userId, 'organizations._id': { $ne: orgId } },
      update: [
        { $set: $addToSet('organizations', { _id: orgId, role }) },
      ],
      session,
      context,
    });
  }

  /**
   * Changes the role for an existing organization manager.
   *
   * @param {object} params
   * @param {ObjectId|string} params.userId
   * @param {ObjectId|string} params.orgId
   * @param {string} params.role
   * @param {object} [params.session]
   * @param {object} [params.context]
   * @returns
   */
  async changeOrgRole(params) {
    const {
      userId,
      orgId,
      role,
      session,
      context,
    } = await validateAsync(object({
      userId: userProps.id.required(),
      orgId: organizationProps.id.required(),
      role: organizationProps.managerRole.required(),
      session: object(),
      context: contextSchema,
    }).required(), params);

    return this.update({
      filter: {
        _id: userId,
        organizations: { $elemMatch: { _id: orgId, role: { $ne: role } } },
      },
      update: [
        { $set: $mergeArrayObject('organizations', { $eq: ['$$v._id', orgId] }, { role }) },
      ],
      session,
      context,
    });
  }

  /**
   * Creates a magic login link token for the provided user ID.
   *
   * @param {object} params
   * @param {string} params.userId
   * @param {string} [params.ip]
   * @param {string} [params.ua]
   * @param {string} [params.ttl=3600]
   * @param {string} [params.scope]
   * @param {boolean} [params.impersonated=false]
   * @param {function} [params.inTransaction]
   */
  async createLoginLinkToken(params = {}) {
    const {
      userId,
      ip,
      ua,
      ttl,
      scope,
      impersonated,
      session: currentSession,
      inTransaction,
    } = await validateAsync(object({
      userId: userProps.id.required(),
      ip: userEventProps.ip,
      ua: userEventProps.ua,
      ttl: tokenProps.ttl.default(3600),
      scope: string(),
      impersonated: boolean().default(false),
      session: object(),
      inTransaction: func(),
    }).required(), params);

    const session = currentSession || await this.client.startSession();
    const previouslyStarted = session.inTransaction();
    if (!previouslyStarted) session.startTransaction();

    try {
      const user = await this.findByObjectId({
        id: userId,
        options: { strict: true, projection: { email: 1 }, session },
      });

      const data = { ...(scope && { scope }), ...(impersonated && { impersonated }) };

      const token = await this.manager.$('token').createAndSignToken({
        doc: {
          subject: 'login-link',
          audience: user._id,
          ttl: impersonated ? 60 : ttl,
          ...(objectHasKeys(data) && { data }),
        },
        session,
      });

      await this.manager.$('user-event').create({
        doc: {
          userId: user._id,
          action: 'send-login-link',
          ip,
          ua,
          data: { scope, loginToken: token, impersonated },
        },
        session,
      });

      if (isFn(inTransaction)) await inTransaction({ user, token });
      if (!previouslyStarted) await session.commitTransaction();
      return token.signed;
    } catch (e) {
      if (!previouslyStarted) await session.abortTransaction();
      throw e;
    } finally {
      if (!previouslyStarted) session.endSession();
    }
  }

  /**
   * Finds a single user by email address.
   *
   * @param {object} params
   * @param {string} params.email
   * @param {object} [params.options]
   */
  findByEmail({ email, options } = {}) {
    return this.findOne({ query: { email }, options });
  }

  /**
   * Magically logs a user in using the provided login token.
   *
   * @param {object} params
   * @param {string} params.loginToken
   * @param {string} [params.ip]
   * @param {string} [params.ua]
   */
  async magicLogin(params = {}) {
    const {
      loginLinkToken: token,
      ip,
      ua,
    } = await validateAsync(object({
      loginLinkToken: string().required(),
      ip: userEventProps.ip,
      ua: userEventProps.ua,
    }).required(), params);

    const loginLinkToken = await this.manager.$('token').verify({ token, subject: 'login-link' });
    const shouldInvalidateToken = get(loginLinkToken, 'doc.data.scope') !== 'invite';
    const impersonated = get(loginLinkToken, 'doc.data.impersonated');
    const user = await this.findByObjectId({
      id: get(loginLinkToken, 'doc.audience'),
      options: { projection: { email: 1 }, strict: true },
    });

    const session = await this.client.startSession();
    session.startTransaction();

    try {
      const authToken = await this.manager.$('token').getOrCreateAuthToken({
        userId: user._id,
        impersonated,
        session,
      });

      await Promise.all([
        ...(shouldInvalidateToken ? [
          this.manager.$('token').invalidate({ id: get(loginLinkToken, 'doc._id'), options: { session } }),
        ] : []),
        this.manager.$('user-event').create({
          doc: {
            userId: user._id,
            action: 'magic-login',
            ip,
            ua,
            data: { loginLinkToken, authToken, impersonated },
          },
          session,
        }),
        impersonated ? Promise.resolve() : this.update({
          filter: { _id: user._id },
          update: [{
            $set: {
              lastLoggedInAt: '$$NOW',
              lastSeenAt: '$$NOW',
              ...$inc('loginCount', 1),
              verified: true,
            },
          }],
          session,
        }),
      ]);

      await session.commitTransaction();
      return {
        authToken: authToken.signed,
        userId: user._id,
        authDoc: authToken.doc,
      };
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  }

  /**
   * Changes the role for an existing organization manager.
   *
   * @param {object} params
   * @param {ObjectId|string} params.userId
   * @param {ObjectId|string} params.orgId
   * @param {object} [params.session]
   * @param {object} [params.context]
   * @returns
   */
  async unmanageOrg(params) {
    const {
      userId,
      orgId,
      session,
      context,
    } = await validateAsync(object({
      userId: userProps.id.required(),
      orgId: organizationProps.id.required(),
      session: object(),
      context: contextSchema,
    }).required(), params);
    return this.update({
      filter: { _id: userId, 'organizations._id': orgId },
      update: [
        { $set: $pull('organizations', { $ne: ['$$v._id', orgId] }) },
      ],
      session,
      context,
    });
  }
}

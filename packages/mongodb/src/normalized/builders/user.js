import { PropTypes, attempt } from '@parameter1/prop-types';

import { BaseBuilder } from './-base.js';
import { eventProps } from '../../command/event-store.js';

const { boolean, object, oneOrMany } = PropTypes;

export class UserBuilder extends BaseBuilder {
  /**
   *
   * @param {object} params
   * @param {string} params.entityType
   */
  constructor() {
    super({ entityType: 'user' });
  }

  /**
   *
   * @param {object} params
   * @param {*|*[]} [params.entityIds=[]]
   * @param {boolean} [params.withMergeStage=true]
   */
  buildPipeline(params) {
    const { entityIds, withMergeStage } = attempt(params, object({
      entityIds: oneOrMany(eventProps.entityId).required(),
      withMergeStage: boolean().default(true),
    }).required());

    return this.build({
      entityIds,
      withMergeStage,
      valueBranches: [{
        case: { $eq: ['$$this.command', 'MAGIC_LOGIN'] },
        then: {
          lastLoggedInAt: '$$this.date',
          loginCount: { $add: [{ $ifNull: ['$$value.values.loginCount', 0] }, 1] },
          verified: true,
        },
      }],
    });
  }
}
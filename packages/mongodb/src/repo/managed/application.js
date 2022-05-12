import { PropTypes, validateAsync } from '@parameter1/prop-types';
import { sluggify } from '@parameter1/slug';

import AbstractManagementRepo from './-abstract.js';
import { applicationProps, applicationSchema, contextSchema } from '../../schema/index.js';
import { buildMaterializedApplicationPipeline } from '../materializer.js';

const { object } = PropTypes;

export default class ApplicationRepo extends AbstractManagementRepo {
  /**
   *
   * @param {object} params
   */
  constructor(params = {}) {
    super({
      ...params,
      collectionName: 'applications',
      collatableFields: [],
      indexes: [
        { key: { key: 1 }, unique: true },
        { key: { slug: 1 } },
      ],
      schema: applicationSchema,
      materializedPipelineBuilder: buildMaterializedApplicationPipeline,
      onMaterialize: async ({ materializedIds }) => {
        const update = new Map();
        update.set('workspace', { 'application._id': { $in: materializedIds } });
        const workspaceIds = await this.manager.$('workspace').distinct({
          key: '_id',
          query: { 'application._id': { $in: materializedIds } },
          options: { useGlobalFindCriteria: false },
        });
        if (workspaceIds.length) update.set('user', { 'workspaces._id': { $in: workspaceIds } });
        return update;
      },
    });
  }

  /**
   * Finds an application by key.
   *
   * @param {object} params
   * @param {string} params.key
   * @param {object} [params.options]
   */
  findByKey({ key, options } = {}) {
    return this.findOne({ query: { key }, options });
  }

  /**
   * Changes the name for the provided application ID.
   *
   * @param {object} params
   * @param {ObjectId|string} params.id
   * @param {string} params.name
   * @param {object} [params.session]
   * @param {object} [params.context]
   * @returns {Promise<BulkWriteResult>}
   */
  async updateName(params) {
    const {
      id,
      name,
      session,
      context,
    } = await validateAsync(object({
      id: applicationProps.id.required(),
      name: applicationProps.name.required(),
      session: object(),
      context: contextSchema,
    }).required(), params);

    return this.update({
      filter: { _id: id, name: { $ne: name } },
      materializeFilter: { _id: id },
      many: false,
      update: [{ $set: { name, slug: sluggify(name) } }],
      session,
      context,
    });
  }
}
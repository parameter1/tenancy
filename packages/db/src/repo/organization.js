import { ManagedRepo, cleanDocument } from '@parameter1/mongodb';
import Joi, { validateAsync } from '@parameter1/joi';
import { organizationAttributes as attrs } from '../schema/attributes/index.js';

export default class OrganizationRepo extends ManagedRepo {
  /**
   *
   * @param {object} params
   */
  constructor(params = {}) {
    super({
      ...params,
      collectionName: 'organizations',
      collatableFields: ['name'],
      indexes: [
        { key: { slug: 1 }, unique: true, collation: { locale: 'en_US' } },

        { key: { name: 1, _id: 1 }, collation: { locale: 'en_US' } },
      ],
    });
  }

  /**
   * @param {object} params
   * @param {string} params.name
   * @param {string} params.slug
   * @param {object} [params.options]
   */
  async create(params = {}) {
    const {
      name,
      slug,
      options,
    } = await validateAsync(Joi.object({
      name: attrs.name.required(),
      slug: attrs.slug.required(),
      options: Joi.object().default({}),
    }).required(), params);

    const now = new Date();
    return this.insertOne({
      doc: cleanDocument({
        name,
        slug,
        date: {
          created: now,
          updated: now,
        },
        managers: [],
        workspaces: [],
      }, { preserveEmptyArrays: true }),
      options,
    });
  }

  /**
   * @param {object} params
   * @param {string} params.name
   * @param {object} [params.options]
   */
  async updateName(params = {}) {
    const {
      id,
      name,
    } = await validateAsync(Joi.object({
      id: attrs.id.required(),
      name: attrs.name.required(),
    }).required(), params);

    const session = await this.client.startSession();
    session.startTransaction();

    try {
      // attempt to update the org.
      const result = await this.updateOne({
        query: { _id: id },
        update: { $set: { name, 'date.updated': new Date() } },
        options: { strict: true, session },
      });

      // then update relationships.
      await Promise.all([
        // user managers
        this.manager.$('user').updateMany({
          query: { 'manages.org._id': id },
          update: { $set: { 'manages.$[elem].org.name': name } },
          options: {
            arrayFilters: [{ 'elem.org._id': id }],
            session,
          },
        }),
        // user memberships
        this.manager.$('user').updateMany({
          query: { 'memberships.workspace.org._id': id },
          update: { $set: { 'memberships.$[elem].workspace.org.name': name } },
          options: {
            arrayFilters: [{ 'elem.workspace.org._id': id }],
            session,
          },
        }),
        // workspaces
        this.manager.$('workspace').updateMany({
          query: { 'org._id': id },
          update: { $set: { 'org.name': name } },
          options: {
            session,
          },
        }),
        // app workspaces
        this.manager.$('application').updateMany({
          query: { 'workspaces.org._id': id },
          update: { $set: { 'workspaces.$[elem].org.name': name } },
          options: {
            arrayFilters: [{ 'elem.org._id': id }],
            session,
          },
        }),
      ]);

      await session.commitTransaction();
      return result;
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  }

  /**
   * Finds an organization by slug.
   *
   * @param {object} params
   * @param {string} params.slug
   * @param {object} [params.options]
   */
  findBySlug({ slug, options } = {}) {
    return this.findOne({ query: { slug }, options });
  }
}

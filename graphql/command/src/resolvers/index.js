import merge from 'lodash.merge';
import { ObjectId } from '@parameter1/sso-mongodb-core';
import { GraphQLDateTime, GraphQLObjectId } from '@parameter1/sso-graphql';

import user from './user.js';

export default merge({
  DateTime: GraphQLDateTime,
  ObjectID: GraphQLObjectId(ObjectId),

  /**
   *
   */
  Mutation: {
    /**
     *
     */
    ping() {
      return 'pong';
    },
  },

  /**
   *
   */
  Query: {
    /**
     *
     */
    ping() {
      return 'pong';
    },
  },
}, user);

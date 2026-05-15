import { mergeResolvers } from '@graphql-tools/merge';
import userResolvers from './resolvers/userResolver.js';
import adminResolvers from './resolvers/adminResolver.js';

export default mergeResolvers([userResolvers, adminResolvers]);

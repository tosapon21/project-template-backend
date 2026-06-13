import { mergeResolvers } from '@graphql-tools/merge';
import userResolvers from './resolvers/userResolver.js';
import adminResolvers from './resolvers/adminResolver.js';
import languageResolvers from './resolvers/languageResolver.js';
import webTextResolvers from './resolvers/webTextResolver.js';

export default mergeResolvers([userResolvers, adminResolvers, languageResolvers, webTextResolvers]);

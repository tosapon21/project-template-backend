export default `
    type AccessUserObj {
        access_token: String!
        id: Int!
        email: String!
        user_name: String
        expires_in: Int!
        permission: [String]!
    }

    input loginInput {
        login: String!
        password: String!
    }

    input signupInput {
        login: String!
        password: String!
        email: String!
    }

    input changePasswordInput {
        current_password: String!
        new_password: String!
    }

    type UserData {
        id: Int
        user_name: String
        email: String
        status: Int
        last_login: String
        profile_img_code: String
        createdAt: String
    }

    type Query {
        logIn(lginput: loginInput!): String
        getAccessToken: AccessUserObj
        checkPermission(permission_string: String!): Boolean
        getUserDetail(id: Int!): UserData
    }

    type Mutation {
        signUp(suinput: signupInput!): Boolean
        logout: Boolean
        changePassword(cpinput: changePasswordInput!): Boolean
        updateProfileImage(file_ext: String): Boolean
        cleanupWhitelist: Boolean
    }
`;

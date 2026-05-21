export default `
    scalar Upload

    type AccessUserObj {
        access_token: String!
        id: Int!
        email: String!
        user_name: String
        expires_in: Int!
        permission: [String]!
        refresh_token: String!
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

    input profileInput {
        first_name: String
        last_name: String
        nick_name: String
    }

    type UserData {
        id: Int
        user_name: String
        email: String
        status: Int
        last_login: String
        profile_img_code: String
        first_name: String
        last_name: String
        nick_name: String
        createdAt: String
    }

    type Query {
        logIn(lginput: loginInput!): String
        getAccessToken: AccessUserObj
        checkPermission(permission_string: String!): Boolean
        getMyProfile: UserData
        getUserDetail(id: Int!): UserData
    }

    type Mutation {
        signUp(suinput: signupInput!): Boolean
        verifyEmail(key: String!): Boolean
        requestPasswordReset(email: String!): Boolean
        resetPassword(key: String!, new_password: String!): Boolean
        logout: Boolean
        changePassword(cpinput: changePasswordInput!): Boolean
        updateMyProfile(profile_input: profileInput!): UserData
        updateProfileImage(file: Upload!, file_ext: String): Boolean
        cleanupWhitelist: Boolean
    }
`;

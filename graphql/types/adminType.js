export default `
    type RoleData {
        id: Int
        role_name: String
    }

    type RoleListData {
        role_count: Int
        role_list: [RoleData]
    }

    type PrivilegeData {
        id: Int
        type: String
        privilege_code: String
        description: String
    }

    type UserRoleData {
        id: Int
        user_name: String
        email: String
        roles: [RoleData]
    }

    type RolePrivilegeData {
        id: Int
        role_name: String
        privileges: [PrivilegeData]
    }

    input roleInput {
        role_name: String!
    }

    input privilegeInput {
        type: String!
        privilege_code: String!
        description: String
    }

    type Query {
        getUserList: [UserData]
        getRoleList: RoleListData
        getPrivilege(id: Int!): PrivilegeData
        getPrivilegeList: [PrivilegeData]
        getUserRole(id: Int!): [RoleData]
        getUserRoleList: [UserRoleData]
        getRolePrivilege(id: Int!): [PrivilegeData]
        getRolePrivilegeList: [RolePrivilegeData]
    }

    type Mutation {
        addRole(role_input: roleInput!): Boolean
        deleteRole(role_id: Int!): Boolean
        addPrivilege(privilege_input: privilegeInput!): PrivilegeData
        updatePrivilege(privilege_id: Int!, privilege_input: privilegeInput!): PrivilegeData
        deletePrivilege(privilege_id: Int!): Boolean
        setUserRole(user_id: Int!, role_id_list: [Int]!): Boolean
        setRolePrivilege(role_id: Int!, privilege_id_list: [Int]!): Boolean
        setUserStatus(user_id: Int!, status: Int!): Boolean
    }
`;

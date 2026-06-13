export default `
    type LanguageData {
        id: Int
        symbol: String
        description: String
    }

    type LanguageListData {
        languages: [LanguageData]
    }

    type Query {
        getLanguageList: LanguageListData
    }
`;

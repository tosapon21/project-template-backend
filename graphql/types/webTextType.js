export default `
    type WebTextData {
        id: Int
        type: String
        language_id: Int
        language: LanguageData
        tag_name: String
        text: String
    }

    type WebTextListData {
        count: Int
        rows: [WebTextData]
    }

    type Query {
        getWebText(language_list: [Int]): [WebTextData]
        getWebTextList: WebTextListData
    }
`;

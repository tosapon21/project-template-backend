import db from '../../server/models/index.js';

const { Language } = db.database1;

export default {
    Query: {
        async getLanguageList() {
            const languages = await Language.findAll({
                order: [['id', 'ASC']]
            });

            return { languages };
        }
    }
};

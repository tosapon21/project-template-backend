import { Op } from 'sequelize';
import db from '../../server/models/index.js';
import Validate from '../../shared/validate.js';

const { WebText, Language } = db.database1;

export default {
    Query: {
        async getWebText(obj, args) {
            const languageList = Array.isArray(args.language_list) && args.language_list.length > 0
                ? args.language_list
                : [1];

            return WebText.findAll({
                where: {
                    language_id: { [Op.in]: languageList }
                },
                include: [{
                    model: Language,
                    as: 'language'
                }],
                order: [
                    ['language_id', 'ASC'],
                    ['type', 'ASC'],
                    ['tag_name', 'ASC']
                ]
            });
        },

        async getWebTextList(obj, args, { req }) {
            await Validate.checkPrivilege(req, 'IS_ADMIN');
            const result = await WebText.findAndCountAll({
                include: [{
                    model: Language,
                    as: 'language'
                }],
                order: [
                    ['type', 'ASC'],
                    ['tag_name', 'ASC'],
                    ['language_id', 'ASC']
                ]
            });

            return {
                count: result.count,
                rows: result.rows
            };
        }
    }
};

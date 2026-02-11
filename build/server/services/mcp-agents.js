import axios from 'axios';
import { Constants } from '../../utils/constants.js';
const getMcpServers = async (params) => {
    try {
        const response = await axios.get(Constants.FLUORA_API_URL + '/mcp-agents', {
            params
        });
        return response.data;
    }
    catch (error) {
        console.error(error);
        return [];
    }
};
export default getMcpServers;

import axios from 'axios';
import { MCPAgentsFilter } from '../types/mcp-agents.js';
import { Constants } from '../../utils/constants.js';

const getMcpServers = async (params: MCPAgentsFilter) => {
  try {
    const response = await axios.get(Constants.FLUORA_API_URL + '/mcp-agents', {
      params
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export default getMcpServers;

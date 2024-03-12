import axios from 'axios';

export interface MyIpResponse {
  ip: string;
}

const api = axios.create({
  baseURL: 'https://ipinfo.io/json'
});

export default api;

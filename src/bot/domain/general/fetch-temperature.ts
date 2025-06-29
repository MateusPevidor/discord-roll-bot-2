import api from '../../services/weather-api';

export interface TemperatureInfo {
  city: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  icon: string;
}

export async function fetchTemperature(city: string): Promise<TemperatureInfo> {
  try {
    const response = await api.get('', {
      params: { q: city }
    });

    const { name } = response.data;
    const { temp, feels_like, humidity } = response.data.main;
    const icon = response.data.weather[0].icon;

    return {
      city: name,
      temp,
      feelsLike: feels_like,
      humidity,
      icon
    };
  } catch (err: any) {
    if (err?.response?.status === 404) {
      throw new Error('CITY_NOT_FOUND');
    }
    throw new Error('API_ERROR');
  }
}

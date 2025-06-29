import {
  fetchTemperature,
  TemperatureInfo
} from '../../../../src/bot/domain/general/fetch-temperature';
import api from '../../../../src/bot/services/weather-api';

// Mock the weather API
jest.mock('../../../../src/bot/services/weather-api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('fetchTemperature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful API responses', () => {
    it('should return temperature info for a valid city', async () => {
      // Arrange
      const mockResponse = {
        data: {
          name: 'London',
          main: {
            temp: 15.5,
            feels_like: 13.2,
            humidity: 72
          },
          weather: [
            {
              icon: '04d'
            }
          ]
        }
      };

      mockedApi.get.mockResolvedValue(mockResponse);

      // Act
      const result = await fetchTemperature('London');

      // Assert
      const expected: TemperatureInfo = {
        city: 'London',
        temp: 15.5,
        feelsLike: 13.2,
        humidity: 72,
        icon: '04d'
      };

      expect(result).toEqual(expected);
      expect(mockedApi.get).toHaveBeenCalledWith('', {
        params: { q: 'London' }
      });
      expect(mockedApi.get).toHaveBeenCalledTimes(1);
    });

    it('should handle different temperature values correctly', async () => {
      // Arrange
      const mockResponse = {
        data: {
          name: 'Tokyo',
          main: {
            temp: 25.8,
            feels_like: 28.1,
            humidity: 65
          },
          weather: [
            {
              icon: '01d'
            }
          ]
        }
      };

      mockedApi.get.mockResolvedValue(mockResponse);

      // Act
      const result = await fetchTemperature('Tokyo');

      // Assert
      expect(result.city).toBe('Tokyo');
      expect(result.temp).toBe(25.8);
      expect(result.feelsLike).toBe(28.1);
      expect(result.humidity).toBe(65);
      expect(result.icon).toBe('01d');
    });

    it('should handle cities with special characters', async () => {
      // Arrange
      const mockResponse = {
        data: {
          name: 'São Paulo',
          main: {
            temp: 22.0,
            feels_like: 24.5,
            humidity: 80
          },
          weather: [
            {
              icon: '10d'
            }
          ]
        }
      };

      mockedApi.get.mockResolvedValue(mockResponse);

      // Act
      const result = await fetchTemperature('São Paulo');

      // Assert
      expect(result.city).toBe('São Paulo');
      expect(mockedApi.get).toHaveBeenCalledWith('', {
        params: { q: 'São Paulo' }
      });
    });

    it('should handle negative temperatures', async () => {
      // Arrange
      const mockResponse = {
        data: {
          name: 'Moscow',
          main: {
            temp: -12.3,
            feels_like: -18.7,
            humidity: 45
          },
          weather: [
            {
              icon: '13d'
            }
          ]
        }
      };

      mockedApi.get.mockResolvedValue(mockResponse);

      // Act
      const result = await fetchTemperature('Moscow');

      // Assert
      expect(result.temp).toBe(-12.3);
      expect(result.feelsLike).toBe(-18.7);
    });
  });

  describe('Error handling', () => {
    it('should throw CITY_NOT_FOUND error when API returns 404', async () => {
      // Arrange
      const mockError = {
        response: {
          status: 404
        }
      };

      mockedApi.get.mockRejectedValue(mockError);

      // Act & Assert
      await expect(fetchTemperature('InvalidCity')).rejects.toThrow(
        'CITY_NOT_FOUND'
      );
      expect(mockedApi.get).toHaveBeenCalledWith('', {
        params: { q: 'InvalidCity' }
      });
    });

    it('should throw API_ERROR for other HTTP error statuses', async () => {
      // Arrange
      const mockError = {
        response: {
          status: 500
        }
      };

      mockedApi.get.mockRejectedValue(mockError);

      // Act & Assert
      await expect(fetchTemperature('London')).rejects.toThrow('API_ERROR');
    });

    it('should throw API_ERROR for network errors', async () => {
      // Arrange
      const mockError = new Error('Network Error');

      mockedApi.get.mockRejectedValue(mockError);

      // Act & Assert
      await expect(fetchTemperature('London')).rejects.toThrow('API_ERROR');
    });

    it('should throw API_ERROR when error has no response property', async () => {
      // Arrange
      const mockError = {
        message: 'Some other error'
      };

      mockedApi.get.mockRejectedValue(mockError);

      // Act & Assert
      await expect(fetchTemperature('London')).rejects.toThrow('API_ERROR');
    });

    it('should throw API_ERROR for 401 unauthorized', async () => {
      // Arrange
      const mockError = {
        response: {
          status: 401
        }
      };

      mockedApi.get.mockRejectedValue(mockError);

      // Act & Assert
      await expect(fetchTemperature('London')).rejects.toThrow('API_ERROR');
    });

    it('should throw API_ERROR for 403 forbidden', async () => {
      // Arrange
      const mockError = {
        response: {
          status: 403
        }
      };

      mockedApi.get.mockRejectedValue(mockError);

      // Act & Assert
      await expect(fetchTemperature('London')).rejects.toThrow('API_ERROR');
    });
  });

  describe('Edge cases and data validation', () => {
    it('should handle zero temperature values', async () => {
      // Arrange
      const mockResponse = {
        data: {
          name: 'Antarctica',
          main: {
            temp: 0,
            feels_like: 0,
            humidity: 30
          },
          weather: [
            {
              icon: '13d'
            }
          ]
        }
      };

      mockedApi.get.mockResolvedValue(mockResponse);

      // Act
      const result = await fetchTemperature('Antarctica');

      // Assert
      expect(result.temp).toBe(0);
      expect(result.feelsLike).toBe(0);
    });

    it('should handle very high humidity values', async () => {
      // Arrange
      const mockResponse = {
        data: {
          name: 'Rainforest',
          main: {
            temp: 28.5,
            feels_like: 35.2,
            humidity: 95
          },
          weather: [
            {
              icon: '09d'
            }
          ]
        }
      };

      mockedApi.get.mockResolvedValue(mockResponse);

      // Act
      const result = await fetchTemperature('Rainforest');

      // Assert
      expect(result.humidity).toBe(95);
    });

    it('should handle empty city names gracefully', async () => {
      // Arrange
      const mockError = {
        response: {
          status: 404
        }
      };

      mockedApi.get.mockRejectedValue(mockError);

      // Act & Assert
      await expect(fetchTemperature('')).rejects.toThrow('CITY_NOT_FOUND');
    });

    it('should preserve exact decimal values from API', async () => {
      // Arrange
      const mockResponse = {
        data: {
          name: 'Precision City',
          main: {
            temp: 23.456789,
            feels_like: 25.123456,
            humidity: 67
          },
          weather: [
            {
              icon: '02d'
            }
          ]
        }
      };

      mockedApi.get.mockResolvedValue(mockResponse);

      // Act
      const result = await fetchTemperature('Precision City');

      // Assert
      expect(result.temp).toBe(23.456789);
      expect(result.feelsLike).toBe(25.123456);
    });
  });

  describe('API parameter validation', () => {
    it('should pass the correct city parameter to the API', async () => {
      // Arrange
      const mockResponse = {
        data: {
          name: 'New York',
          main: {
            temp: 20,
            feels_like: 22,
            humidity: 55
          },
          weather: [
            {
              icon: '02d'
            }
          ]
        }
      };

      mockedApi.get.mockResolvedValue(mockResponse);

      // Act
      await fetchTemperature('New York');

      // Assert
      expect(mockedApi.get).toHaveBeenCalledWith('', {
        params: { q: 'New York' }
      });
    });

    it('should handle cities with spaces and special characters in API call', async () => {
      // Arrange
      const mockResponse = {
        data: {
          name: 'Los Angeles',
          main: {
            temp: 25,
            feels_like: 27,
            humidity: 60
          },
          weather: [
            {
              icon: '01d'
            }
          ]
        }
      };

      mockedApi.get.mockResolvedValue(mockResponse);
      const cityName = 'Los Angeles, CA';

      // Act
      await fetchTemperature(cityName);

      // Assert
      expect(mockedApi.get).toHaveBeenCalledWith('', {
        params: { q: cityName }
      });
    });
  });
});

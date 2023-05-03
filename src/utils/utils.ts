import converter from "hsl-to-rgb-for-reals";

const temperatureToColor = (temperature: number) => {
  function rgbToHex(r: number, g: number, b: number) {
    return (r << 16) + (g << 8) + b;
  }
  temperature += 10;

  const [r, g, b] = converter(Math.abs(temperature - 60) * 4, 1, 0.5);
  const value = rgbToHex(r, g, b);

  return value;
};

export { temperatureToColor }
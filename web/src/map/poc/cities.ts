// Datos de prueba: población aproximada del área metropolitana, en millones.
export interface City {
  name: string
  lon: number
  lat: number
  pop: number
}

export const CITIES: City[] = [
  { name: 'Tokyo', lon: 139.69, lat: 35.69, pop: 37.1 },
  { name: 'Delhi', lon: 77.21, lat: 28.61, pop: 33.8 },
  { name: 'Shanghai', lon: 121.47, lat: 31.23, pop: 29.9 },
  { name: 'São Paulo', lon: -46.63, lat: -23.55, pop: 22.8 },
  { name: 'Ciudad de México', lon: -99.13, lat: 19.43, pop: 22.3 },
  { name: 'El Cairo', lon: 31.24, lat: 30.04, pop: 22.2 },
  { name: 'Mumbai', lon: 72.88, lat: 19.08, pop: 21.3 },
  { name: 'Beijing', lon: 116.4, lat: 39.9, pop: 21.8 },
  { name: 'Dhaka', lon: 90.41, lat: 23.81, pop: 23.2 },
  { name: 'New York', lon: -74.01, lat: 40.71, pop: 18.9 },
  { name: 'Buenos Aires', lon: -58.38, lat: -34.6, pop: 15.5 },
  { name: 'Estambul', lon: 28.98, lat: 41.01, pop: 15.8 },
  { name: 'Lagos', lon: 3.38, lat: 6.52, pop: 15.9 },
  { name: 'Moscú', lon: 37.62, lat: 55.76, pop: 12.7 },
  { name: 'París', lon: 2.35, lat: 48.86, pop: 11.3 },
  { name: 'Londres', lon: -0.13, lat: 51.51, pop: 9.7 },
  { name: 'Los Ángeles', lon: -118.24, lat: 34.05, pop: 12.5 },
  { name: 'Madrid', lon: -3.7, lat: 40.42, pop: 6.8 },
  { name: 'Sídney', lon: 151.21, lat: -33.87, pop: 5.4 },
  { name: 'Johannesburgo', lon: 28.05, lat: -26.2, pop: 6.2 },
]

const byName = (name: string) => CITIES.find((c) => c.name === name)!

export const ARCS: [City, City][] = (
  [
    ['Madrid', 'Buenos Aires'],
    ['Madrid', 'Ciudad de México'],
    ['Londres', 'New York'],
    ['París', 'El Cairo'],
    ['Tokyo', 'Los Ángeles'],
    ['Shanghai', 'Sídney'],
    ['Delhi', 'Londres'],
    ['Lagos', 'São Paulo'],
    ['Moscú', 'Beijing'],
    ['Johannesburgo', 'Mumbai'],
  ] as const
).map(([a, b]) => [byName(a), byName(b)])

// data.js
export const dataPromise = fetch('data.json')
  .then(res => res.json())
  .then(dataArray => {
    const dataMap = new Map(dataArray.map(item => [item.mID, item]));
    return { dataArray, dataMap };
  });

// main.js
import { dataPromise } from './data.js';
const { dataMap } = await dataPromise;
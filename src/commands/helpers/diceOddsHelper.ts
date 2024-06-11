import {
  create as MathCreate,
  all as MathAll,
  MathJsChain,
  MathType
} from 'mathjs';

export function calculateOdds(faces: number, hits: number) {
  const { chain, bignumber, format } = MathCreate(MathAll, {
    precision: 64,
    number: 'BigNumber'
  });

  let odds = chain(bignumber(1)) as MathJsChain<MathType>;

  for (let i = 0; i < hits; i++) {
    odds = odds.divide(bignumber(faces));
  }

  return format(odds.multiply(100).done(), {
    notation: 'fixed',
    precision: 10
  });
}

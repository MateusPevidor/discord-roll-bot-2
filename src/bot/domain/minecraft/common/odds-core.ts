import {
  create as MathCreate,
  all as MathAll,
  MathJsChain,
  MathType,
  BigNumber
} from 'mathjs';

import { generateSequenceArray, integerPartition } from '@/shared/utils';

export const barterData = {
  fireRes: {
    odds: 10 / 423,
    inverseOdds: 413 / 423,
    amount: generateSequenceArray(1, 1),
    name: 'Fire Resistance'
  },
  glowstone: {
    odds: 5 / 846,
    inverseOdds: 403 / 423,
    amount: generateSequenceArray(5, 12),
    name: 'Glowstone Dust'
  },
  pearl: {
    odds: 4 / 423,
    inverseOdds: 403 / 423,
    amount: generateSequenceArray(4, 8),
    name: 'Ender Pearl'
  },
  string: {
    odds: 20 / 7191,
    inverseOdds: 403 / 423,
    amount: generateSequenceArray(8, 24),
    name: 'String'
  },
  obsidian: {
    odds: 40 / 423,
    inverseOdds: 383 / 423,
    amount: generateSequenceArray(1, 1),
    name: 'Obsidian'
  },
  cryingObsidian: {
    odds: 40 / 1269,
    inverseOdds: 383 / 423,
    amount: generateSequenceArray(1, 3),
    name: 'Crying Obsidian'
  }
};

export type Barter = keyof typeof barterData;

export function calculateOdds(
  n: number,
  k: number,
  eventOdds: number,
  type: string,
  formatResult: boolean = true
) {
  const { pow, combinations, chain, bignumber, format } = MathCreate(MathAll, {
    precision: 64,
    number: 'BigNumber'
  });

  if (k > n) throw new Error('Drops cannot be the greatest value');

  if (type === 'or_less') {
    let odds = chain(0) as MathJsChain<MathType>;
    for (let i = 0; i <= k; i++) {
      const iterationOdds = chain(1)
        .multiply(pow(bignumber(eventOdds), i))
        .multiply(pow(bignumber(1 - eventOdds), n - i))
        .multiply(bignumber(combinations(n, i)));
      odds = odds.add(iterationOdds.done());
    }
    if (!formatResult) return odds.multiply(100);
    return format(odds.multiply(100).done(), {
      notation: 'fixed',
      precision: 10
    });
  } else if (type === 'or_more') {
    let odds = chain(0) as MathJsChain<MathType>;
    for (let i = 0; i < n - k + 1; i++) {
      const iterationOdds = chain(1)
        .multiply(pow(bignumber(eventOdds), k + i))
        .multiply(pow(bignumber(1 - eventOdds), n - (k + i)))
        .multiply(bignumber(combinations(n, k + i)));
      odds = odds.add(iterationOdds.done());
    }
    if (!formatResult) return odds.multiply(100);
    return format(odds.multiply(100).done(), {
      notation: 'fixed',
      precision: 10
    });
  } else if (type === 'ends_at') {
    const odds = chain(100)
      .multiply(pow(bignumber(eventOdds), k - 1))
      .multiply(pow(bignumber(1 - eventOdds), n - k))
      .multiply(bignumber(combinations(n - 1, k - 1)))
      .multiply(eventOdds);
    if (!formatResult) return odds;
    return format(odds.done(), { notation: 'fixed', precision: 10 });
  } else {
    const odds = chain(100)
      .multiply(pow(bignumber(eventOdds), k))
      .multiply(pow(bignumber(1 - eventOdds), n - k))
      .multiply(bignumber(combinations(n, k)));
    if (!formatResult) return odds;
    return format(odds.done(), { notation: 'fixed', precision: 10 });
  }
}

export function calculateOddsForCompare(
  n: number,
  k: number,
  eventOdds: number,
  type: string
) {
  const { bignumber, sum } = MathCreate(MathAll, {
    precision: 64,
    number: 'BigNumber'
  });

  const entries = [];
  let i = k;
  while (true && i <= n * 4) {
    const odds = calculateOdds(
      i,
      k,
      eventOdds,
      type,
      false
    ) as MathJsChain<MathType>;
    entries.push({ i, odds });

    if (odds.smaller(0.001).done()) break;

    i++;
  }

  const values = entries.map((entry) => bignumber(entry.odds.done() as any));
  const topOdds = values.slice(0, n - k + 1);

  const total = sum(values);
  const top = (sum(topOdds) / total) * 100;
  const bottom = 100 - top;

  const odds = entries.map((entry) => {
    return {
      i: entry.i,
      odds: bignumber(entry.odds.done() as any)
    };
  });

  return { top, bottom, odds };
}

export function barterOdds(
  trades: number,
  drops: number,
  loot: Barter,
  type: string
) {
  const barter = barterData[loot];

  if (drops > trades * barter.amount.at(-1)!)
    throw new Error(
      'Drops cannot be greater than Trades. Maximum drops: ' +
        trades * barter.amount.at(-1)!
    );

  const { pow, chain, bignumber, format, factorial, compare } = MathCreate(
    MathAll,
    {
      precision: 64,
      number: 'BigNumber'
    }
  );

  let approximate = false;

  const factorialTable: BigNumber[] = [];
  function getFactorial(n: number) {
    if (n in factorialTable) {
      return factorialTable[n];
    } else {
      const result = factorial<BigNumber>(bignumber(n));
      factorialTable[n] = result;
      return result;
    }
  }

  const roundsTable: Map<string, MathType> = new Map<string, MathType>();
  function getRound(numbers: number[], _trades: number = trades) {
    const key = numbers.sort().join(',');
    if (roundsTable.has(key)) {
      return roundsTable.get(key)!;
    } else {
      const roundSum = numbers.reduce((acc, curr) => acc + curr, 0);

      if (_trades - roundSum < 0) return 0;

      let coefficient = chain(1)
        .multiply(getFactorial(_trades))
        .divide(getFactorial(_trades - roundSum));

      for (const repetition of numbers) {
        coefficient = coefficient.divide(getFactorial(repetition));
      }

      const iterationOdds = chain(1)
        .multiply(pow(bignumber(barter.odds), roundSum))
        .multiply(pow(bignumber(barter.inverseOdds), _trades - roundSum))
        .multiply(coefficient.done())
        .done();

      roundsTable.set(key, iterationOdds);

      return iterationOdds;
    }
  }

  if (type === 'or_less') {
    let odds = chain(0) as MathJsChain<MathType>;
    for (let i = 0; i <= drops; i++) {
      const rounds = integerPartition(i, barter.amount);

      if (rounds.length > 200000) {
        approximate = true;
        break;
      }

      let roundOdds: MathType = 0;
      for (const round of rounds) {
        roundOdds = getRound(round);
        odds = odds.add(roundOdds);
      }
      if (compare(roundOdds, bignumber(1e-20)) == -1 && rounds.length > 1) {
        approximate = true;
        break;
      }
    }
    return {
      odds: format(odds.multiply(100).done(), {
        notation: 'fixed',
        precision: 10
      }),
      approximate
    };
  } else if (type === 'or_more') {
    let odds = chain(1) as MathJsChain<MathType>;
    for (let i = 0; i <= drops - 1; i++) {
      const rounds = integerPartition(i, barter.amount);

      if (rounds.length > 200000) {
        approximate = true;
        break;
      }

      let roundOdds: MathType = 0;
      for (const round of rounds) {
        roundOdds = getRound(round);
        odds = odds.subtract(roundOdds);
      }
      if (compare(roundOdds, bignumber(1e-20)) == -1 && rounds.length > 1) {
        approximate = true;
        break;
      }
    }
    return {
      odds: format(odds.multiply(100).done(), {
        notation: 'fixed',
        precision: 10
      }),
      approximate
    };
  } else if (type === 'ends_at') {
    let totalOdds = chain(0) as MathJsChain<MathType>;

    const min = barter.amount.at(0)!;
    const max = barter.amount.at(-1)!;

    for (let i = drops - max; i < drops; i++) {
      for (let j = drops - i; j <= max; j++) {
        if (j < min) continue;

        let odds = chain(0) as MathJsChain<MathType>;
        const rounds = integerPartition(i, barter.amount);

        for (const round of rounds) {
          odds = odds.add(getRound(round, trades - 1));
        }

        const iterationOdds = chain(1)
          .multiply(odds.done())
          .multiply(bignumber(barter.odds))
          .done();

        totalOdds = totalOdds.add(iterationOdds);
      }
    }

    return {
      odds: format(totalOdds.multiply(100).done(), {
        notation: 'fixed',
        precision: 10
      }),
      approximate
    };
  } else {
    let odds = chain(0) as MathJsChain<MathType>;
    const rounds = integerPartition(drops, barter.amount);

    for (const round of rounds) {
      odds = odds.add(getRound(round));
    }
    return {
      odds: format(odds.multiply(100).done(), {
        notation: 'fixed',
        precision: 10
      }),
      approximate
    };
  }
}

function generatePartitionsWithParts(n: number, parts: number[]): number[][] {
  const partitions: number[][] = [];
  const dp: number[][] = [];

  for (let i = 0; i <= n; i++) {
    dp[i] = [];
    dp[i][0] = 1;
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = (i >= j ? dp[i - j][j] : 0) + dp[i][j - 1];
    }
  }

  function generatePartitionHelper(
    target: number,
    max: number,
    current: number[]
  ): void {
    if (target === 0) {
      partitions.push([...current]);
      return;
    }

    for (const part of parts) {
      if (part <= max && target >= part) {
        current.push(part);
        generatePartitionHelper(target - part, part, current);
        current.pop();
      }
    }
  }

  generatePartitionHelper(n, n, []);
  return partitions;
}

function countOccurrences(partitions: number[][]): number[][] {
  const occurences = partitions.map((partition) => {
    const countMap = new Map<number, number>();
    partition.forEach((num) => {
      countMap.set(num, (countMap.get(num) || 0) + 1);
    });
    return Array.from(countMap.values());
  });

  return occurences;
}

export function integerPartition(n: number, parts: number[]): number[][] {
  const partitions = generatePartitionsWithParts(n, parts);
  return countOccurrences(partitions);
}

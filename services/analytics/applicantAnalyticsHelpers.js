'use strict';


function text(value) {
  return String(
    value ?? ''
  ).trim();
}


function normalizedText(value) {
  return text(value)
    .toLowerCase();
}


function humanize(value) {
  return text(value)
    .replace(
      /[_-]+/g,
      ' '
    )
    .replace(
      /\b\w/g,
      character =>
        character.toUpperCase()
    );
}


function asDate(value) {
  if (!value) {
    return null;
  }

  const date =
    value instanceof Date
      ? new Date(
          value.getTime()
        )
      : new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}


function percentage(
  value,
  total,
  decimals = 1
) {
  if (!total) {
    return 0;
  }

  return Number(
    (
      Number(value || 0) /
      Number(total) *
      100
    ).toFixed(decimals)
  );
}


function average(
  values,
  decimals = 2
) {
  const numeric =
    values
      .map(Number)
      .filter(
        value =>
          Number.isFinite(
            value
          )
      );

  if (
    numeric.length === 0
  ) {
    return null;
  }

  const result =
    numeric.reduce(
      (
        sum,
        value
      ) =>
        sum + value,
      0
    ) /
    numeric.length;

  return Number(
    result.toFixed(
      decimals
    )
  );
}


function minimum(values) {
  const numeric =
    values
      .map(Number)
      .filter(
        value =>
          Number.isFinite(
            value
          )
      );

  if (
    numeric.length === 0
  ) {
    return null;
  }

  return Math.min(
    ...numeric
  );
}


function maximum(values) {
  const numeric =
    values
      .map(Number)
      .filter(
        value =>
          Number.isFinite(
            value
          )
      );

  if (
    numeric.length === 0
  ) {
    return null;
  }

  return Math.max(
    ...numeric
  );
}


function monthKey(value) {
  const date =
    asDate(value);

  if (!date) {
    return '';
  }

  return [
    date.getUTCFullYear(),

    String(
      date.getUTCMonth() +
      1
    ).padStart(
      2,
      '0'
    ),
  ].join('-');
}


function fixedBreakdown({
  records = [],
  keys = [],
  getKey,
  labels = {},
}) {
  const counts =
    Object.fromEntries(
      keys.map(
        key => [
          key,
          0,
        ]
      )
    );

  for (
    const record of records
  ) {
    const key =
      normalizedText(
        getKey(record)
      );

    if (
      Object.prototype
        .hasOwnProperty.call(
          counts,
          key
        )
    ) {
      counts[key] +=
        1;
    }
  }

  return keys.map(
    key => ({
      key,

      label:
        labels[key] ||
        humanize(key),

      count:
        counts[key],

      percent:
        percentage(
          counts[key],
          records.length
        ),
    })
  );
}


function rankedBreakdown({
  records = [],
  getValues,
  limit = 10,
  includeUnknown = false,
}) {
  const counts =
    new Map();

  for (
    const record of records
  ) {
    const raw =
      getValues(record);

    const values =
      Array.isArray(raw)
        ? raw
        : [raw];

    for (
      const value of values
    ) {
      const clean =
        text(value);

      if (
        !clean &&
        !includeUnknown
      ) {
        continue;
      }

      const label =
        clean ||
        'Unknown';

      const key =
        normalizedText(
          label
        );

      const existing =
        counts.get(key);

      if (existing) {
        existing.count +=
          1;
      } else {
        counts.set(
          key,
          {
            key,
            label,
            count: 1,
          }
        );
      }
    }
  }

  const sorted =
    [
      ...counts.values(),
    ].sort(
      (a, b) =>
        b.count -
          a.count ||
        a.label.localeCompare(
          b.label
        )
    );

  const total =
    sorted.reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.count,
      0
    );

  return sorted
    .slice(
      0,
      Math.max(
        0,
        limit
      )
    )
    .map(
      item => ({
        ...item,

        percent:
          percentage(
            item.count,
            total
          ),
      })
    );
}


function monthlySeries({
  records = [],
  getDate,
}) {
  const counts =
    new Map();

  for (
    const record of records
  ) {
    const period =
      monthKey(
        getDate(record)
      );

    if (!period) {
      continue;
    }

    counts.set(
      period,
      (
        counts.get(
          period
        ) ||
        0
      ) + 1
    );
  }

  let cumulative =
    0;

  return [
    ...counts.entries(),
  ]
    .sort(
      (
        [left],
        [right]
      ) =>
        left.localeCompare(
          right
        )
    )
    .map(
      ([
        period,
        count,
      ]) => {
        cumulative +=
          count;

        return {
          period,
          count,
          cumulative,
        };
      }
    );
}


function histogram({
  values = [],
  bins = [],
}) {
  const numeric =
    values
      .map(Number)
      .filter(
        value =>
          Number.isFinite(
            value
          )
      );

  return bins.map(
    (
      bin,
      index
    ) => {
      const isLast =
        index ===
        bins.length - 1;

      const count =
        numeric.filter(
          value =>
            value >=
              bin.min &&
            (
              isLast
                ? value <=
                    bin.max
                : value <
                    bin.max
            )
        ).length;

      return {
        key:
          bin.key,

        label:
          bin.label,

        min:
          bin.min,

        max:
          bin.max,

        count,

        percent:
          percentage(
            count,
            numeric.length
          ),
      };
    }
  );
}


function buildMatrix({
  records = [],
  rowValues = [],
  columnKeys = [],
  getRow,
  getColumn,
}) {
  const rows =
    rowValues.map(
      row => ({
        key:
          row.key,

        label:
          row.label,

        total: 0,

        values:
          Object.fromEntries(
            columnKeys.map(
              key => [
                key,
                0,
              ]
            )
          ),
      })
    );

  const byKey =
    new Map(
      rows.map(
        row => [
          normalizedText(
            row.key
          ),
          row,
        ]
      )
    );

  for (
    const record of records
  ) {
    const rowKey =
      normalizedText(
        getRow(record)
      );

    const columnKey =
      normalizedText(
        getColumn(record)
      );

    const row =
      byKey.get(
        rowKey
      );

    if (
      !row ||
      !Object.prototype
        .hasOwnProperty.call(
          row.values,
          columnKey
        )
    ) {
      continue;
    }

    row.values[
      columnKey
    ] += 1;

    row.total +=
      1;
  }

  return rows
    .filter(
      row =>
        row.total >
        0
    )
    .sort(
      (a, b) =>
        b.total -
          a.total ||
        a.label.localeCompare(
          b.label
        )
    );
}


function topDistinctValues(
  records,
  getValue,
  limit = 10
) {
  return rankedBreakdown({
    records,
    getValues:
      getValue,
    limit,
  }).map(
    item => ({
      key:
        item.key,

      label:
        item.label,
    })
  );
}


module.exports = {
  text,
  normalizedText,
  humanize,
  asDate,
  percentage,
  average,
  minimum,
  maximum,
  monthKey,
  fixedBreakdown,
  rankedBreakdown,
  monthlySeries,
  histogram,
  buildMatrix,
  topDistinctValues,
};

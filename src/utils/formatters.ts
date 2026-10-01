export function formatM3(val: number | null | undefined, digits: number = 2): string {
  if (val == null || isNaN(val)) return '0';
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(val);
}

export function formatVND(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return '0 đ';
  return (
    new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val) + ' đ'
  );
}

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function getMonthName(monthIndex: number): string {
  const months = [
    'Tháng 1',
    'Tháng 2',
    'Tháng 3',
    'Tháng 4',
    'Tháng 5',
    'Tháng 6',
    'Tháng 7',
    'Tháng 8',
    'Tháng 9',
    'Tháng 10',
    'Tháng 11',
    'Tháng 12',
  ];
  return months[monthIndex - 1] || '';
}

export function toInputDateTime(dateInput?: string | Date | null): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16);
}

/**
 * Safely parse numeric input strings, supporting both Vietnamese comma decimals (0,05)
 * and standard dot decimals (0.05), as well as thousand separators (1.000.000 or 1,000,000).
 */
export function parseNumberInput(val: string | number | null | undefined): number {
  if (val == null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let str = String(val).trim();
  if (!str) return 0;

  // Replace multiple thousand separator dots if pattern like 1.200.000
  if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
    str = str.replace(/\./g, '');
  } else if (/^\d{1,3}(,\d{3})+$/.test(str)) {
    str = str.replace(/,/g, '');
  } else if (str.includes(',') && !str.includes('.')) {
    // Only comma used as decimal e.g. 0,05 or 12,5
    str = str.replace(',', '.');
  } else if (str.includes('.') && str.includes(',')) {
    // Both: 1.200,50 vs 1,200.50
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

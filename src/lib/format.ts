export const formatVnd = (value: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(value))}đ`;

/** "4.9" style ratings, keeping one decimal. */
export const formatRating = (value: number) => value.toFixed(1);

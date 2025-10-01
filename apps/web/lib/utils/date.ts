export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const currentYear = now.getFullYear();
  const dateYear = date.getFullYear();

  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const time = date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // If same year, omit the year
  if (dateYear === currentYear) {
    return `${day} ${month}, ${time}`;
  }

  // Different year, include abbreviated year
  const yearShort = dateYear.toString().slice(-2);
  return `${day} ${month} ${yearShort}, ${time}`;
}

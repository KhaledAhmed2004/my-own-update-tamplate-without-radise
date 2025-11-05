// Monitor utilities

function shouldHideEntry(entry) {
  const url = String(entry && entry.url || '');
  return url.includes('/observability');
}

module.exports = {
  shouldHideEntry,
};
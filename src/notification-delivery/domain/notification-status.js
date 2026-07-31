const STATUSES = Object.freeze({
  SCHEDULED: 'Scheduled',
  SENT: 'Sent',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
});

const ALL = Object.freeze(Object.values(STATUSES));

function isValid(status) {
  return ALL.includes(status);
}

module.exports = { STATUSES, ALL, isValid };

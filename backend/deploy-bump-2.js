// Deployment bump 2: update timestamp to trigger Cloud Run build
module.exports = {
  deployedAt: new Date().toISOString(),
  note: "second bump"
};

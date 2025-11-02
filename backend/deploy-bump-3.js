// Deployment bump 3: update timestamp to trigger Cloud Run build
module.exports = {
  deployedAt: new Date().toISOString(),
  note: "third bump"
};

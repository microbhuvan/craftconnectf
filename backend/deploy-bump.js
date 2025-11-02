// Deployment bump: update timestamp to trigger Cloud Run build
module.exports = {
  deployedAt: new Date().toISOString(),
};

const Link = ({ href, children, className, ...rest }) =>
  require("react").createElement("a", { href, className, ...rest }, children);
Link.displayName = "Link";
module.exports = Link;
module.exports.default = Link;

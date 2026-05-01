// Maps CLI flags to backend query keys expected by parseListParams().
const buildListQuery = (opts) => {
  const p = new URLSearchParams();
  if (opts.gender) p.set("gender", opts.gender);
  if (opts.country) p.set("country_id", opts.country);
  if (opts.ageGroup) p.set("age_group", String(opts.ageGroup).toLowerCase());
  if (opts.minAge != null && opts.minAge !== "") p.set("min_age", String(opts.minAge));
  if (opts.maxAge != null && opts.maxAge !== "") p.set("max_age", String(opts.maxAge));
  if (opts.minGenderProbability != null && opts.minGenderProbability !== "") {
    p.set("min_gender_probability", String(opts.minGenderProbability));
  }
  if (opts.minCountryProbability != null && opts.minCountryProbability !== "") {
    p.set("min_country_probability", String(opts.minCountryProbability));
  }
  if (opts.sortBy) p.set("sort_by", opts.sortBy);
  if (opts.order) p.set("order", opts.order);
  if (opts.page != null && opts.page !== "") p.set("page", String(opts.page));
  if (opts.limit != null && opts.limit !== "") p.set("limit", String(opts.limit));
  const qs = p.toString();
  return qs ? `?${qs}` : "";
};

module.exports = { buildListQuery };

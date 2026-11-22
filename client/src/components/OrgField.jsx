import { useEffect } from 'react';
import Field, { DomainTail } from './Field.jsx';
import { slugFromHostname } from '../lib/api.js';

/** Org slug field. Prefills from the subdomain (e.g. brightside-dental.localhost) when there is one. */
export default function OrgField({ form }) {
  useEffect(() => {
    const sub = slugFromHostname();
    if (sub && !form.values.slug) form.setField('slug', sub);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Field
      label="Organization address"
      placeholder="brightside-dental"
      autoComplete="organization"
      autoCapitalize="none"
      suffix={DomainTail}
      {...form.bind('slug')}
    />
  );
}

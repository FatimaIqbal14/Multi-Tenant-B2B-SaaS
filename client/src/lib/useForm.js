import { useMemo, useState } from 'react';

/**
 * Tiny form hook around a Zod schema.
 *  - errors show only after a field was touched (blurred) or a submit was attempted
 *  - server-side field errors (422/409) are merged in and cleared as the user edits
 */
export function useForm(schema, initial) {
  const [values, setValues] = useState(initial);
  const [touched, setTouched] = useState({});
  const [serverErrors, setServerErrors] = useState({});

  const result = useMemo(() => schema.safeParse(values), [schema, values]);
  const clientErrors = useMemo(() => {
    const out = {};
    if (!result.success) for (const i of result.error.issues) out[i.path[0]] ??= i.message;
    return out;
  }, [result]);

  const setField = (name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
    setServerErrors((e) => ({ ...e, [name]: undefined }));
  };
  const touch = (name) => setTouched((t) => ({ ...t, [name]: true }));
  const error = (name) => serverErrors[name] || (touched[name] ? clientErrors[name] : '') || '';

  /** Spread onto a <Field>: value, onChange, onBlur, error. */
  const bind = (name) => ({
    name,
    value: values[name] ?? '',
    onChange: (e) => setField(name, e.target.value),
    onBlur: () => touch(name),
    error: error(name),
  });

  const handleSubmit = (fn) => async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(Object.keys(initial).map((k) => [k, true])));
    if (result.success) await fn(result.data, values);
  };

  return { values, setField, bind, handleSubmit, setServerErrors, isValid: result.success };
}

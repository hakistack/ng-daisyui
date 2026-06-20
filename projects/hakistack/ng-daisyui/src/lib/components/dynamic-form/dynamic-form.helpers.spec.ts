import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import { createForm, field, layout, validation } from './dynamic-form.helpers';
import { FormConfig, FormSubmissionData } from './dynamic-form.types';

describe('createForm', () => {
  describe('object form (classic)', () => {
    it('builds a config from a plain input object', () => {
      const form = createForm({
        title: 'Sign up',
        fields: [field.text('name', 'Name', { required: true }), field.email('email', 'Email')],
        onSubmit: () => {},
      });

      const config = form.config();
      expect(config.title).toBe('Sign up');
      expect(config.layout).toBe('vertical'); // default
      expect(config.fields).toHaveLength(2);
      expect(config.fields?.[0]?.key).toBe('name');
      expect(config.fields?.[0]?.required).toBe(true);
      expect(config.fields?.[1]?.email).toBe(true);
    });

    it('exposes submit/reset that bump the internal triggers', () => {
      const form = createForm({ fields: [] });
      const before = form.config()._submitTrigger?.();
      form.submit();
      const after = form.config()._submitTrigger?.();
      expect(after).toBe((before ?? 0) + 1);

      const resetBefore = form.config()._resetTrigger?.();
      form.reset();
      expect(form.config()._resetTrigger?.()).toBe((resetBefore ?? 0) + 1);
    });
  });

  describe('callback DSL form', () => {
    it('builds the same config from a callback receiving the DSL', () => {
      const onSubmit = vi.fn();
      const form = createForm(({ field, layout, validation }) => ({
        ...layout.vertical({ gap: 'md' }),
        fields: [
          field.text('name', 'Full Name', { required: true }),
          field.email('email', 'Email Address', { required: true }),
          field.password('password', 'Password', validation.password(8)),
        ],
        onSubmit,
      }));

      const config = form.config();
      expect(config.layout).toBe('vertical');
      expect(config.gap).toBe('md');
      expect(config.fields).toHaveLength(3);

      const password = config.fields?.[2];
      expect(password?.key).toBe('password');
      expect(password?.required).toBe(true);
      expect(password?.minLength).toBe(8);
    });

    it('passes the exact same builder objects into the callback', () => {
      let captured: { field: unknown; layout: unknown; validation: unknown; step: unknown } | undefined;
      createForm((dsl) => {
        captured = { field: dsl.field, layout: dsl.layout, validation: dsl.validation, step: dsl.step };
        return { fields: [] };
      });

      expect(captured?.field).toBe(field);
      expect(captured?.layout).toBe(layout);
      expect(captured?.validation).toBe(validation);
    });

    it('honours layout.grid from the DSL', () => {
      const form = createForm(({ field, layout }) => ({
        ...layout.grid(3, { gap: 'lg' }),
        fields: [field.text('a'), field.text('b')],
      }));

      const config = form.config();
      expect(config.layout).toBe('grid');
      expect(config.gridColumns).toBe(3);
      expect(config.gap).toBe('lg');
    });

    it('wires steps into stepperConfig defaults', () => {
      const form = createForm(({ field, step }) => ({
        steps: [step.create('one', 'One', [field.text('name')]), step.review('done', 'Review')],
      }));

      const config = form.config();
      expect(config.steps).toHaveLength(2);
      expect(config.stepperConfig?.linear).toBe(true);
      expect(config.stepperConfig?.validateStepOnNext).toBe(true);
    });
  });

  describe('typed values', () => {
    interface UserForm {
      name: string;
      email: string;
    }

    it('flows the generic through onSubmit in both forms', () => {
      // Compile-time check: `values` is typed as UserForm — runtime just asserts shape passthrough.
      const received: FormSubmissionData<UserForm>[] = [];
      const onSubmit = (data: FormSubmissionData<UserForm>) => received.push(data);

      const objectForm = createForm<UserForm>({
        fields: [field.text('name'), field.email('email')],
        onSubmit,
      });
      const callbackForm = createForm<UserForm>(({ field }) => ({
        fields: [field.text('name'), field.email('email')],
        onSubmit,
      }));

      objectForm.config().onSubmit?.({ values: { name: 'a', email: 'b' }, valid: true, errors: {} });
      callbackForm.config().onSubmit?.({ values: { name: 'c', email: 'd' }, valid: true, errors: {} });

      expect(received).toHaveLength(2);
      expect(received[0].values.name).toBe('a');
      expect(received[1].values.email).toBe('d');
    });
  });

  describe('declarative schema form (fields map)', () => {
    it('converts a fields map into resolved FormFieldConfig[] keyed by property name', () => {
      const form = createForm({
        layout: { type: 'vertical', gap: 'md' },
        fields: {
          name: { type: 'text', label: 'Full Name', validation: { required: true, minLength: 2, maxLength: 80 } },
          email: { type: 'email', label: 'Email Address', validation: { required: true, email: true } },
          password: { type: 'password', label: 'Password', validation: { required: true, minLength: 8, passwordStrength: 'medium' } },
        },
        onSubmit: () => {},
      });

      const config = form.config();
      expect(config.layout).toBe('vertical');
      expect(config.gap).toBe('md');
      expect(config.fields).toHaveLength(3);

      const [name, email, password] = config.fields!;
      expect(name.key).toBe('name');
      expect(name.label).toBe('Full Name');
      expect(name.required).toBe(true);
      expect(name.minLength).toBe(2);
      expect(name.maxLength).toBe(80);

      expect(email.type).toBe('email');
      expect(email.email).toBe(true);

      expect(password.type).toBe('password');
      expect(password.minLength).toBe(8);
      expect(password.pattern).toBeInstanceOf(RegExp); // passwordStrength → pattern
    });

    it('humanizes the field name when no label is given', () => {
      const form = createForm({
        fields: { firstName: { type: 'text' } },
      });
      expect(form.config().fields?.[0]?.label).toBe('First Name');
    });

    it('maps number/checkbox/select/date specifics', () => {
      const form = createForm({
        fields: {
          age: { type: 'number', min: 0, validation: { required: true, max: 120 } },
          active: { type: 'checkbox', value: true },
          role: { type: 'select', options: ['Admin', 'User'], validation: { required: true } },
          dob: { type: 'date' },
        },
      });

      const config = form.config();
      const byKey = (k: string) => config.fields!.find((f) => f.key === k)!;
      expect(byKey('age').min).toBe(0);
      expect(byKey('age').max).toBe(120);
      expect(byKey('age').required).toBe(true);
      expect(byKey('active').defaultValue).toBe(true);
      expect(byKey('role').choices).toEqual([
        { label: 'Admin', value: 'Admin' },
        { label: 'User', value: 'User' },
      ]);
      expect(byKey('dob').type).toBe('date');
    });

    it('fires the declarative onSubmit with raw values only when valid', () => {
      const onSubmit = vi.fn();
      const form = createForm({
        fields: { name: { type: 'text', validation: { required: true } } },
        onSubmit,
      });

      // Component passes FormSubmissionData; the wrapper unwraps `.values` and gates on `valid`.
      form.config().onSubmit?.({ values: { name: 'Ada' }, valid: false, errors: {} });
      expect(onSubmit).not.toHaveBeenCalled();

      form.config().onSubmit?.({ values: { name: 'Ada' }, valid: true, errors: {} });
      expect(onSubmit).toHaveBeenCalledWith({ name: 'Ada' });
    });

    it('threads a cross-field validate function into the config', () => {
      const form = createForm({
        fields: {
          password: { type: 'password', validation: { required: true } },
          confirmPassword: { type: 'password', validation: { required: true } },
        },
        validate: (data) => (data.password !== data.confirmPassword ? { confirmPassword: 'Passwords do not match' } : null),
      });

      const validate = form.config().validate!;
      expect(validate({ password: 'a', confirmPassword: 'b' })).toEqual({ confirmPassword: 'Passwords do not match' });
      expect(validate({ password: 'a', confirmPassword: 'a' })).toBeNull();
    });
  });

  describe('type inference (compile-time)', () => {
    it('infers the values shape for validate/onSubmit from the fields map', () => {
      createForm({
        fields: {
          name: { type: 'text', label: 'Full Name' },
          age: { type: 'number', label: 'Age' },
          active: { type: 'checkbox', label: 'Active' },
          role: { type: 'select', options: ['Admin', 'User'] },
          dob: { type: 'date' },
        },
        validate: (data) => {
          expectTypeOf(data.name).toEqualTypeOf<string>();
          expectTypeOf(data.age).toEqualTypeOf<number>();
          expectTypeOf(data.active).toEqualTypeOf<boolean>();
          expectTypeOf(data.role).toEqualTypeOf<string>();
          expectTypeOf(data.dob).toEqualTypeOf<Date | null>();
          return null;
        },
        onSubmit: (data) => {
          expectTypeOf(data.name).toEqualTypeOf<string>();
          expectTypeOf(data.age).toEqualTypeOf<number>();
          expectTypeOf(data.active).toEqualTypeOf<boolean>();
        },
      });

      expect(true).toBe(true);
    });

    it('lets a typed controller bind to the component (FormConfig<T> → FormConfig)', () => {
      // Variance check: the component input is `FormConfig` (default Record<string, any>).
      // `FormConfig`'s callbacks use method-signature (bivariant) syntax, so a typed
      // `config()` must remain assignable to the input type — no `any` cast needed.
      const form = createForm({
        fields: { name: { type: 'text' }, age: { type: 'number' } },
        onSubmit: () => {},
      });
      const asInput: FormConfig = form.config();
      expect(asInput.fields).toBeDefined();

      // Same for the explicit-generic array API.
      const typed = createForm<{ name: string }>({ fields: [field.text('name')] });
      const asInput2: FormConfig = typed.config();
      expect(asInput2).toBeDefined();
    });

    it('infers a string-literal union for `as const` select options', () => {
      createForm({
        fields: {
          plan: { type: 'select', options: ['free', 'pro'] as const },
        },
        onSubmit: (data) => {
          expectTypeOf(data.plan).toEqualTypeOf<'free' | 'pro'>();
        },
      });
      expect(true).toBe(true);
    });
  });
});

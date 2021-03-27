import { result, ok, err } from './result';

describe('result', () => {
  test('should create a promise', done => {
    expect.assertions(1);

    const { promise } = result(Promise.resolve(ok('foo')));

    promise.then(result => {
      if (result.ok) {
        expect(result.value).toBe('foo');
      }
      done();
    });
  });
  test('should cancel a result', done => {
    expect.assertions(1);

    const { cancel, promise } = result(Promise.resolve(err('foo', 123)));

    promise.then(result => {
      if (!result.ok) {
        expect(result.error.type).toBe('CANCELLED');
      }

      done();
    });

    cancel();
  });
  test('should resolve', done => {
    expect.assertions(1);

    const { resolve } = result(Promise.resolve(ok('foo')));

    resolve(value => {
      expect(value).toBe('foo');
      done();
    }, {});
  });
  test('should cancel a resolve', done => {
    expect.assertions(1);

    const { resolve } = result(Promise.resolve(ok('foo')));

    const cancel = resolve(() => {}, {
      CANCELLED: () => {
        expect(true).toBe(true);
        done();
      },
    });

    cancel();
  });
  test('should cancel a nested resolve', done => {
    expect.assertions(1);

    const { resolve } = result(Promise.resolve(ok('foo')));

    const cancel = resolve(
      () => {
        return result(Promise.resolve(ok('bar'))).resolve(() => {}, {
          CANCELLED: () => {
            expect(true).toBe(true);
            done();
          },
        });
      },
      {
        CANCELLED: () => {
          console.log('I GOT CNACELLED INSTEAD');
        },
      },
    );

    Promise.resolve()
      .then(() => {})
      .then(() => cancel());
  });
});

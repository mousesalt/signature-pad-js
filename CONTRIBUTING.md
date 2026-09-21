# Contributing

Thanks for contributing to SmoothSignaturePad.

## Guidelines

- Keep the library dependency-free.
- Prefer standard browser APIs.
- Keep the public API small and backward compatible when possible.
- Test pointer input, touch input, mouse input, resizing, and high-DPI rendering before submitting changes.
- Update `README.md` when an option or public API changes.
- Add an entry to `CHANGELOG.md` for user-visible changes.

## Pull requests

1. Fork the repository.
2. Create a focused branch for your change.
3. Make the smallest practical change.
4. Run `node --check signature-pad.js`.
5. Test the demo in a current desktop browser and on a touch device when the change affects input handling.
6. Open a pull request with a clear description of the problem and solution.

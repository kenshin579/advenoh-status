export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-4 mt-8">
      <div className="max-w-6xl mx-auto px-8 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} Advenoh Status</p>
      </div>
    </footer>
  );
}

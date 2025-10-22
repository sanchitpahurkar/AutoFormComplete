import React from 'react'

const Footer = () => {
  return (
    <footer className="bg-[#0d0d0d] text-gray-400 py-12 px-8 md:px-20 flex flex-col items-start">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

            <div>
            <h2 className="text-2xl font-bold text-gray-200 mb-3">AutoFormComplete</h2>
            <p className="text-sm">
                Automating web form filling using Playwright — save time, reduce errors, and boost efficiency.
            </p>
            </div>

            <div>
            <h3 className="text-lg font-semibold text-white mb-3">Quick Links</h3>
            <ul className="space-y-2">
                <li><a href="/" className="hover:text-white">Home</a></li>
                <li><a href="/parent-form" className="hover:text-white">Parent Form</a></li>
                <li><a href="/admin" className="hover:text-white">Admin Dashboard</a></li>
                <li><a href="/auto-fill" className="hover:text-white">Auto-fill</a></li>
            </ul>
            </div>

            <div className='flex flex-col gap-y-4'>
                <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Contact</h3>
                    <p>Email: <a href="mailto:support@autoformcomplete.com" className="hover:text-white">commonteam007@gmail.com</a></p>
                </div>
                <div>
                    <h3 className='text-lg font-semibold text-white mb-3'>Meet Our Team</h3>
                    <a href='/team' className="mt-2">Our Team</a>
                </div>
            </div>

        </div>
        <p className="mt-4">© 2025 AutoFormComplete</p>
    </footer>

  )
}

export default Footer

import { useUser } from "@clerk/clerk-react";

const Home = () => {

  const { user } = useUser();

  return (
    <div>
      <section className="min-h-screen bg-custom-grad flex flex-col items-center justify-center text-center gap-y-10 py-10 md:py-0">
        <div className="flex flex-col gap-y-2">
          <p className="lg:text-9xl md:text-6xl text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#d9d9d9] via-[#ffffff] to-[#bfbfbf] text-center">Automate Form Filling</p>
          <p className="lg:text-6xl md:text-3xl text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#d9d9d9] via-[#ffffff] to-[#bfbfbf] text-center">Save Hours Instantly.</p>
        </div>

        <div>
          <p className="text-gray-300 md:text-2xl text-lg">Seamlessly auto-fill any application, form, or portal with a single click.</p>
        </div>

        <div className="text-white text-center flex md:flex-row flex-col items-center justify-between gap-x-30">
          <div className="flex flex-col gap-y-6 hover:bg-[#4c2300] p-10 rounded transition duration-500 ease-in-out hover:scale-110 hover:shadow-2xl">
            <img src="/account.svg" className="h-10" alt="" />
            <p className="text-xl font-semibold">Provide your<br/>details</p>
          </div>


          <div className="flex flex-col gap-y-6 hover:bg-[#4c2300] p-10 rounded transition duration-500 ease-in-out hover:scale-110 hover:shadow-2xl">
            <img src="/link.svg" className="h-10" alt="" />
            <p className="text-xl font-semibold">Submit the<br/>form link</p>
          </div>



          <div className="flex flex-col gap-y-6 hover:bg-[#4c2300] p-10 rounded transition duration-500 ease-in-out hover:scale-110 hover:shadow-2xl">
            <img src="/done.svg" className="h-10" alt="" />
            <p className="text-xl font-semibold">Review the form<br/>& submit</p>
          </div>
        </div>

        {user ? (<p className="text-lg text-white">Ready to dive in? 👉 <a href="/parent-form"><button
          className='text-amber-900 bg-white px-4 py-2 rounded cursor-pointer'
        >Parent Form</button></a></p>) 
        : 
        (<p className="text-lg text-white">Ready to dive in? 👉 <a href="/signup"><button
          className='text-amber-900 bg-white px-4 py-2 rounded cursor-pointer'
        >Get Started</button></a></p>)}
      </section>


      {/* section 2 */}
      <section className="flex flex-col lg:flex-row items-center justify-between py-20 lg:py-36 md:px-10 gap-y-10 md:gap-y-20 px-4 lg:px-30">
        <img src="/logo.png" alt="AutoFormComplete logo" className=" md:h-60 h-44 mb-6 md:mb-0" />

        <div className="md:ml-12 max-w-3xl">
          <h2 className="text-4xl font-bold mb-4 text-amber-900">
            Admin Dashboard — All Data, One View
          </h2>
          <p className="text-gray-800 text-lg leading-relaxed">
            Admins can view all student submissions in one unified dashboard. Filter data by course, department, or status — and find insights instantly.
            Simplify management, track completion, and never lose a record again.
          </p>
        </div>
      </section>

      {/* seciton 3 */}
      <section className="flex flex-col lg:flex-row items-center justify-between py-20 lg:py-36 md:px-10 gap-y-10 md:gap-y-20 px-4 lg:px-30">
        <div className="md:ml-12 max-w-3xl">
          <h2 className="text-4xl font-bold mb-4 text-amber-900">
            Smart Automation, Maximum Accuracy
          </h2>
          <p className="text-gray-800 text-lg leading-relaxed">
            AutoFormComplete uses intelligent field mapping powered by Playwright automation. It recognizes text fields, dropdowns, and patterns automatically — reducing manual errors and ensuring your data is filled precisely, every single time.
          </p>
        </div>

        <img src="/automation.png" alt="AutoFormComplete logo" className="hidden lg:block md:h-88 h-44 mb-6 md:mb-0 lg:mr-15" />
      </section>


    </div>

  )
}

export default Home

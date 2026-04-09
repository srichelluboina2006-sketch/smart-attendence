import React, { useState } from 'react'
import axios from 'axios'

export default function TestPage() {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const testCreateUser = async () => {
    setLoading(true)
    setResult('Creating user...')
    try {
      const response = await axios.post('http://localhost:8080/users/create', {
        name: 'Test Faculty',
        username: 'testfaculty',
        password: 'test123',
        email: 'test@college.edu',
        role: 'faculty'
      })
      setResult('✅ User created: ' + JSON.stringify(response.data))
    } catch (err) {
      setResult('❌ Error: ' + (err.response?.data?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  const testGetUsers = async () => {
    setLoading(true)
    setResult('Fetching users...')
    try {
      const response = await axios.get('http://localhost:8080/users')
      setResult('✅ Users fetched: ' + JSON.stringify(response.data, null, 2))
    } catch (err) {
      setResult('❌ Error: ' + (err.response?.data?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  const testCreateDept = async () => {
    setLoading(true)
    setResult('Creating department...')
    try {
      const response = await axios.post('http://localhost:8080/departments/create', {
        deptName: 'Test Department',
        deptCode: 'TEST'
      })
      setResult('✅ Department created: ' + JSON.stringify(response.data))
    } catch (err) {
      setResult('❌ Error: ' + (err.response?.data?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  const testGetDepts = async () => {
    setLoading(true)
    setResult('Fetching departments...')
    try {
      const response = await axios.get('http://localhost:8080/departments')
      setResult('✅ Departments fetched: ' + JSON.stringify(response.data, null, 2))
    } catch (err) {
      setResult('❌ Error: ' + (err.response?.data?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">API Test Page</h1>
      
      <div className="space-y-4 mb-8">
        <button onClick={testCreateUser} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Test Create User
        </button>
        <button onClick={testGetUsers} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 ml-2">
          Test Get Users
        </button>
        <button onClick={testCreateDept} disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 ml-2">
          Test Create Department
        </button>
        <button onClick={testGetDepts} disabled={loading} className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 ml-2">
          Test Get Departments
        </button>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="font-bold mb-2">Result:</h2>
        <pre className="whitespace-pre-wrap break-words text-sm">{result}</pre>
      </div>
    </div>
  )
}

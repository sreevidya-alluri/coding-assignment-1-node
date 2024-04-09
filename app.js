const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const format = require('date-fns/format')
const isValid = require('date-fns/isValid')

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'todoApplication.db')
let db = null

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is running on http://localhost:3000/')
    })
  } catch (error) {
    console.log(`Database error is ${error.message}`)
    process.exit(1)
  }
}
initializeDbAndServer()

const hasPriorityAndStatusProperties = requestQuery => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  )
}

const hasCategoryAndStatusProperties = requestQuery => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  )
}

const hasCategoryAndPriorityProperties = requestQuery => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  )
}

const hasCategoryPriority = requestQuery => {
  return requestQuery.category !== undefined
}

const hasPriorityProperty = requestQuery => {
  return requestQuery.priority !== undefined
}

const hasStatusProperty = requestQuery => {
  return requestQuery.status !== undefined
}

const hasDueDateProperty = requestQuery => {
  return requestQuery.dueDate !== undefined
}

const isValidTodoPriority = item => {
  return item === 'HIGH' || item === 'MEDIUM' || item === 'LOW'
}

const isValidTodoCategory = item => {
  return item === 'WORK' || item === 'HOME' || item === 'LEARNING'
}

const isValidTodoStatus = item => {
  return item === 'TO DO' || item === 'IN PROGRESS' || item === 'DONE'
}

const isValidTodoDueDate = item => {
  return isValid(new Date(item))
}

const convertDueDate = dbObject => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    status: dbObject.status,
    category: dbObject.category,
    dueDate: dbObject.due_date,
  }
}

app.get('/todos/', async (request, response) => {
  let data = null
  let getTodoQuery = ''
  const {search_q = '', priority, status, category} = request.query
  switch (true) {
    case hasPriorityAndStatusProperties(request.query):
      getTodoQuery = `
        SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND status = '${status}' AND priority= '${priority}';`
      if (isValidTodoPriority(priority) && isValidTodoStatus(status)) {
        data = await db.all(getTodoQuery)
        response.send(data.map(object => convertDueDate(object)))
      } else if (isValidTodoPriority(priority)) {
        response.status(400).send('Invalid Todo Status')
      } else {
        response.status(400).send('Invalid Todo Priority')
      }
      break
    case hasCategoryAndStatusProperties(request.query):
      getTodoQuery = `
        SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND status = '${status}' 
        AND category = '${category}';
      `
      if (isValidTodoCategory(category) && isValidTodoStatus(status)) {
        data = await db.all(getTodoQuery)
        response.send(data.map(object => convertDueDate(object)))
      } else if (isValidTodoCategory(category)) {
        response.status(400).send('Invalid Todo Status')
      } else {
        response.status(400).send('Invalid Todo Category')
      }
      break
    case hasCategoryAndPriorityProperties(request.query):
      getTodoQuery = `
        SELECT * FROM todo WHERE todo Like  '%${search_q}%' AND priority='${priority}'
        AND category='${category}';
      `
      if (isValidTodoCategory(category) && isValidTodoPriority(priority)) {
        data = await db.all(getTodoQuery)
        response.send(data.map(object => convertDueDate(object)))
      } else if (isValidTodoCategory(category)) {
        response.status(400).send('Invalid Todo Priority')
      } else {
        response.status(400).send('Invalid Todo Category')
      }
      break
    case hasCategoryPriority(request.query):
      getTodoQuery = `
        SELECT * FROM todo WHERE todo LIKE '%${search_q}%' 
        AND category = '${category}';
      `
      if (isValidTodoCategory(category)) {
        data = await db.all(getTodoQuery)
        response.send(data.map(object => convertDueDate(object)))
      } else {
        response.status(400).send('Invalid Todo Category')
      }
      break
    case hasPriorityProperty(request.query):
      getTodoQuery = `
        SELECT *  FROM todo WHERE todo LIKE '%${search_q}' AND priority= '${priority}';
      `
      if (isValidTodoPriority(priority)) {
        data = await db.all(getTodoQuery)
        response.send(data.map(object => convertDueDate(object)))
      } else {
        response.status(400).send('Invalid Todo Priority')
      }
      break
    case hasStatusProperty(request.query):
      getTodoQuery = `
        SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND status ='${status}';
      `
      if (isValidTodoStatus(status)) {
        data = await db.all(getTodoQuery)
        response.send(data.map(object => convertDueDate(object)))
      } else {
        response.status(400).send('Invalid Todo Status')
      }
      break
    default:
      getTodoQuery = `
        SELECT * FROM todo WHERE todo LIKE '%${search_q}%';
      `
      data = await db.all(getTodoQuery)
      response.send(data.map(object => convertDueDate(object)))
  }
})

app.get('/todos/:todoId', async (request, response) => {
  const {todoId} = request.params
  const getTodoQuery = `
    SELECT * FROM todo WHERE id=${todoId};
  `
  const todo = await db.get(getTodoQuery)
  response.send(convertDueDate(todo))
})

app.get('/agenda/', async (request, response) => {
  const {date} = request.query
  if (!date || !isValid(new Date(date))) {
    response
      .status(400)
      .send(!date ? 'Invalid Due Date' : 'Invalid Due Date Format')
  } else {
    const formattedDate = format(new Date(date), 'yyyy-MM-dd')
    const getTodoQuery = `SELECT * FROM todo WHERE due_date= '${formattedDate}';`
    const todo = await db.all(getTodoQuery)
    response.send(todo.map(object => convertDueDate(object)))
  }
})

app.post('/todos/', async (request, response) => {
  const todoDetails = request.body
  const {id, todo, priority, status, category, dueDate} = todoDetails
  if (!isValidTodoCategory(category)) {
    response.status(400).send('Invalid Todo Category')
  } else if (!isValidTodoDueDate(dueDate)) {
    response.status(400).send('Invalid Due Date')
  } else {
    const formattedDate = format(new Date(dueDate), 'yyyy-MM-dd')
    const addTodoQuery = `INSERT INTO 
      todo(id,todo,priority,status,category,due_date)
      VALUES(
        ${id},
        '${todo}',
        '${priority}',
        '${status}',
        '${category}',
        '${formattedDate}'
      );`
    const dbResponse = await db.run(addTodoQuery)
    response.send('Todo Successfully Added')
  }
})

app.put('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const todoDetails = request.body
  const {todo, priority, status, dueDate, category} = todoDetails
  switch (true) {
    case hasStatusProperty(request.body):
      const updateTodoStatusQuery = `
      UPDATE todo SET status = '${status}' WHERE id=${todoId};`
      if (isValidTodoStatus(status)) {
        await db.run(updateTodoStatusQuery)
        response.send('Status Updated')
      } else {
        response.status(400).send('Invalid Todo Status')
      }
      break
    case hasCategoryProperty(request.body):
      const updateTodoCategoryQuery = `UPDATE todo SET category = '${category}'
      WHERE id=${todoId};`
      if (isValidTodoCategory(category)) {
        await db.run(updateTodoCategoryQuery)
        response.send('Category Updated')
      } else {
        response.status(400).send('Invalid Todo Category')
      }
      break
    case hasPriorityProperty(request.body):
      const updateTodoPriorityQuery = `UPDATE todo SET priority= '${priority}'
      WHERE id=${todoId};`
      if (isValidTodoPriority(priority)) {
        await db.run(updateTodoPriorityQuery)
        response.send('Priority Updated')
      } else {
        response.status(400).send('Invalid Todo Priority')
      }
      break
    case hasDueDateProperty(request.body):
      const updateTodoDueDateQuery = `UPDATE todo SET due_date='${dueDate}' WHERE id=${todoId};`
      if (isValidTodoDueDate(dueDate)) {
        await db.run(updateTodoDueDateQuery)
        response.send('Due Date Updated')
      } else {
        response.status(400).send('Invalid Due Date')
      }
      break
  }
})

app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const deleteTodoQuery = `DELETE FROM todo WHERE id=${todoId};`
  await db.run(deleteTodoQuery)
  response.send('Todo Deleted')
})

module.exports = app

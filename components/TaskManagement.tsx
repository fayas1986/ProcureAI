
import React, { useState } from 'react';
import type { Task, User } from '../types';
import { TaskStatus, TaskPriority } from '../types';
import { Button } from './common/Button';
import { Input } from './common/Input';

interface TaskManagementProps {
  tasks: Task[];
  users: User[];
  purchaseOrderId: string;
  onUpdateTasks: (newTasks: Task[]) => void;
}

const TaskManagement: React.FC<TaskManagementProps> = ({ tasks, users, purchaseOrderId, onUpdateTasks }) => {
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskAssignee, setNewTaskAssignee] = useState(users[0]?._id || '');
    const [newTaskDependency, setNewTaskDependency] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>(TaskPriority.Medium);

    const getAssigneeName = (assigneeId: string) => {
        return users.find(u => u._id === assigneeId)?.name || 'Unassigned';
    };

    const handleAddTask = () => {
        if (!newTaskDesc.trim() || !newTaskAssignee) return;
        const newTask: Task = {
            _id: `T${Date.now()}`,
            poId: purchaseOrderId,
            description: newTaskDesc.trim(),
            assigneeId: newTaskAssignee,
            status: TaskStatus.Open,
            createdAt: new Date().toISOString(),
            dependsOn: newTaskDependency || undefined,
            priority: newTaskPriority,
        };
        onUpdateTasks([...tasks, newTask]);
        setNewTaskDesc('');
        setNewTaskDependency('');
        setNewTaskPriority(TaskPriority.Medium);
    };

    const handleToggleTask = (taskId: string) => {
        const taskToToggle = tasks.find(task => task._id === taskId);
        if (!taskToToggle) return;

        // Check for dependencies before allowing completion
        if (taskToToggle.dependsOn && taskToToggle.status === TaskStatus.Open) {
            const prerequisite = tasks.find(t => t._id === taskToToggle.dependsOn);
            if (prerequisite && prerequisite.status === TaskStatus.Open) {
                alert(`Cannot complete this task. You must first complete: "${prerequisite.description}"`);
                return;
            }
        }

        const updatedTasks = tasks.map(task =>
            task._id === taskId
                ? { ...task, status: task.status === TaskStatus.Open ? TaskStatus.Completed : TaskStatus.Open }
                : task
        );
        onUpdateTasks(updatedTasks);
    };

    const handleDeleteTask = (taskId: string) => {
        // Remove the task and also clear this dependency from any other tasks.
        const updatedTasks = tasks
            .filter(task => task._id !== taskId)
            .map(task => {
                if (task.dependsOn === taskId) {
                    const { dependsOn, ...restOfTask } = task; // Using destructuring to remove the property
                    return restOfTask;
                }
                return task;
            });
        onUpdateTasks(updatedTasks);
    };

    const LockIcon = () => (
        <svg className="w-3 h-3 inline-block mr-1.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
    );
    
    const priorityColors: Record<TaskPriority, string> = {
        [TaskPriority.High]: 'bg-red-500',
        [TaskPriority.Medium]: 'bg-yellow-500',
        [TaskPriority.Low]: 'bg-green-500',
    };

    return (
        <div className="mt-6">
            <h4 className="font-semibold mb-2">Approval Workflow Tasks</h4>
            <div className="space-y-2">
                {tasks.length > 0 ? tasks.map(task => {
                    const prerequisite = task.dependsOn ? tasks.find(t => t._id === task.dependsOn) : null;
                    const isLocked = !!prerequisite && prerequisite.status === TaskStatus.Open;

                    return (
                        <div key={task._id} className={`flex items-center gap-3 p-2 rounded-md bg-muted/50 transition-opacity ${isLocked ? 'opacity-60' : 'hover:bg-muted'}`}>
                             <span
                                title={`Priority: ${task.priority || 'Medium'}`}
                                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${priorityColors[task.priority || TaskPriority.Medium]}`}
                            ></span>
                            <input
                                type="checkbox"
                                checked={task.status === TaskStatus.Completed}
                                onChange={() => handleToggleTask(task._id)}
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary disabled:cursor-not-allowed"
                                disabled={isLocked}
                                title={isLocked ? `This task is locked. Complete prerequisite: "${prerequisite.description}"` : ''}
                            />
                            <div className="flex-grow">
                                <p className={`text-sm ${task.status === TaskStatus.Completed ? 'line-through text-muted-foreground' : ''}`}>
                                     {isLocked && (
                                        <span title={`Depends on: "${prerequisite.description}"`}>
                                            <LockIcon />
                                        </span>
                                    )}
                                    {task.description}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Assigned to: {getAssigneeName(task.assigneeId)}
                                </p>
                            </div>
                             <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task._id)}>
                                 <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </Button>
                        </div>
                    );
                }) : (
                    <p className="text-sm text-muted-foreground p-2">No tasks assigned for this PO.</p>
                )}
            </div>
            <div className="mt-4 border-t pt-4 space-y-3">
                <h5 className="text-sm font-medium">Add New Task</h5>
                <Input
                    placeholder="New task description..."
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    className="w-full"
                />
                <div className="flex flex-wrap gap-2">
                    <div className="flex-grow min-w-[150px]">
                         <label className="text-xs text-muted-foreground">Assign To</label>
                        <select
                            value={newTaskAssignee}
                            onChange={e => setNewTaskAssignee(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                            {users.map(user => (
                                <option key={user._id} value={user._id}>{user.name}</option>
                            ))}
                        </select>
                    </div>
                     <div className="flex-grow min-w-[150px]">
                        <label className="text-xs text-muted-foreground">Depends On</label>
                        <select
                            value={newTaskDependency}
                            onChange={e => setNewTaskDependency(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                            <option value="">No dependency</option>
                            {tasks.filter(t => t.status === TaskStatus.Open).map(task => (
                                <option key={task._id} value={task._id}>{task.description}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-grow min-w-[120px]">
                        <label className="text-xs text-muted-foreground">Priority</label>
                        <select
                            value={newTaskPriority}
                            onChange={e => setNewTaskPriority(e.target.value as TaskPriority)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                            <option value={TaskPriority.Low}>Low</option>
                            <option value={TaskPriority.Medium}>Medium</option>
                            <option value={TaskPriority.High}>High</option>
                        </select>
                    </div>
                    <div className="self-end">
                       <Button onClick={handleAddTask}>Add Task</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskManagement;